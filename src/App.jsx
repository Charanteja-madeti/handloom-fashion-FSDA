import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import CartPage from './pages/cart'
import ContactPage from './pages/contact'
import CheckoutPage from './pages/checkout'
import Dashboard from './pages/dashboard'
import AdminDashboard from './pages/adminDashboard'
import Header from './pages/header'
import HomePage from './pages/home'
import Login from './pages/login'
import ProductTrackingPage from './pages/productTracking'
import ProductDetailsPage from './pages/productdetails'
import ProductsPage from './pages/products'
import products from './pages/productsData'
import Signup from './pages/signup'
import { getCurrentUser, isAuthenticated, logoutUser } from './pages/auth'

const CART_STORAGE_KEY = 'cartItems'
const THEME_STORAGE_KEY = 'themeMode'

function TawkVisibilityManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const shouldHideWidget = pathname === '/login' || pathname === '/signup'

    function updateWidgetVisibility() {
      if (!window.Tawk_API) {
        return false
      }

      if (shouldHideWidget) {
        window.Tawk_API.hideWidget?.()
      } else {
        window.Tawk_API.showWidget?.()
      }

      return true
    }

    if (updateWidgetVisibility()) {
      return undefined
    }

    const intervalId = setInterval(() => {
      if (updateWidgetVisibility()) {
        clearInterval(intervalId)
      }
    }, 300)

    return () => clearInterval(intervalId)
  }, [pathname])

  return null
}

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const isAuth = isAuthenticated()
  const storedUser = getCurrentUser()
  const isAdmin =
    storedUser?.role === 'admin' || storedUser?.email?.trim().toLowerCase() === 'admin@handloom.com'

  if (!isAuth) {
    return <Navigate to="/login" />
  }

  return isAdmin ? children : <Navigate to="/dashboard" />
}

function PrivateLayout({ isDarkMode, onToggleTheme }) {
  const navigate = useNavigate()
  const storedUser = getCurrentUser()
  const isAdmin =
    storedUser?.role === 'admin' || storedUser?.email?.trim().toLowerCase() === 'admin@handloom.com'
  const currentUser = storedUser
    ? {
        name: storedUser.name || storedUser.email?.split('@')[0] || 'User',
        isAdmin,
      }
    : null

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
  }

  return (
    <PrivateRoute>
      <>
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
        />
        <main>
          <Outlet />
        </main>
      </>
    </PrivateRoute>
  )
}

function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light')
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY)

    try {
      const parsedCart = savedCart ? JSON.parse(savedCart) : []

      if (!Array.isArray(parsedCart)) {
        return []
      }

      return parsedCart.map((item) => {
        if (item?.image) {
          return item
        }

        const matchedProduct = products.find((product) => product.id === item?.id)

        if (!matchedProduct?.image) {
          return item
        }

        return { ...item, image: matchedProduct.image }
      })
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    const isDarkMode = themeMode === 'dark'
    document.body.classList.toggle('dark-mode', isDarkMode)
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  function handleToggleTheme() {
    setThemeMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'))
  }

  function handleAddToCart(product) {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id)

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [...prevItems, { ...product, quantity: 1 }]
    })
  }

  function handleIncreaseQuantity(productId) {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    )
  }

  function handleDecreaseQuantity(productId) {
    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  function handleRemoveFromCart(productId) {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId))
  }

  return (
    <div className="app-shell">
      <TawkVisibilityManager />
      <div className="app-content">
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <PrivateLayout
                isDarkMode={themeMode === 'dark'}
                onToggleTheme={handleToggleTheme}
              />
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/products/:id"
              element={<ProductDetailsPage onAddToCart={handleAddToCart} />}
            />
            <Route
              path="/cart"
              element={
                <CartPage
                  cartItems={cartItems}
                  onIncreaseQuantity={handleIncreaseQuantity}
                  onDecreaseQuantity={handleDecreaseQuantity}
                  onRemoveFromCart={handleRemoveFromCart}
                />
              }
            />
            <Route path="/checkout" element={<CheckoutPage cartItems={cartItems} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/admin-dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/product-tracking"
              element={
                <AdminRoute>
                  <ProductTrackingPage />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
      <footer className="site-footer">
        <p>
          <span className="footer-heart" aria-hidden="true">
            ♥
          </span>{' '}
          Made with efforts
        </p>
      </footer>
    </div>
  )
}

export default App
