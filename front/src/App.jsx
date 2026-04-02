import React, { useEffect, useRef, useState } from 'react'
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
import Signup from './pages/signup'
import WishlistPage from './pages/wishlist'
import { getAccessToken, getCurrentUser, isAuthenticated, logoutUser } from './pages/auth'

const CART_STORAGE_KEY = 'cartItems'
const WISHLIST_STORAGE_KEY = 'wishlistItems'
const THEME_STORAGE_KEY = 'themeMode'
const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://handloom-fashion-fsda.onrender.com').trim()
const API_ROOT = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : ''

function apiUrl(path) {
  return `${API_ROOT}${path}`
}

function normalizeCartItem(item) {
  const productId = Number(item?.id)
  const quantity = Number(item?.quantity || 0)
  const price = Number(item?.price || 0)

  if (!Number.isInteger(productId) || productId <= 0) {
    return null
  }

  if (!Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
    return null
  }

  return {
    id: productId,
    name: String(item?.name || '').trim(),
    category: String(item?.category || '').trim(),
    image: String(item?.image || '').trim(),
    price,
    quantity,
  }
}

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

function PrivateLayout({ isDarkMode, onToggleTheme, cartCount, wishlistCount }) {
  const navigate = useNavigate()
  const storedUser = getCurrentUser()
  const isAdmin =
    storedUser?.role === 'admin' || storedUser?.email?.trim().toLowerCase() === 'admin@handloom.com'
  const currentUser = storedUser
    ? {
        name: storedUser.name || storedUser.email?.split('@')[0] || 'User',
        email: storedUser.email || '',
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
          cartCount={cartCount}
          wishlistCount={wishlistCount}
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

      return parsedCart.map((item) => normalizeCartItem(item)).filter(Boolean)
    } catch {
      return []
    }
  })
  const [isCartReady, setIsCartReady] = useState(false)
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY) || '[]')
      if (!Array.isArray(parsed)) {
        return []
      }

      return parsed
        .map((item) => {
          const productId = Number(item?.id)
          const price = Number(item?.price || 0)

          if (!Number.isInteger(productId) || productId <= 0) {
            return null
          }

          return {
            id: productId,
            name: String(item?.name || '').trim(),
            category: String(item?.category || '').trim(),
            image: String(item?.image || '').trim(),
            price: Number.isFinite(price) ? price : 0,
          }
        })
        .filter(Boolean)
    } catch {
      return []
    }
  })
  const cartSyncTimeoutRef = useRef(null)
  const currentUser = getCurrentUser()
  const authStateKey = `${isAuthenticated()}-${String(currentUser?.id || currentUser?.email || '')}`

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems))
  }, [wishlistItems])

  useEffect(() => {
    let ignore = false

    async function fetchBackendCart() {
      const token = getAccessToken()

      if (!isAuthenticated() || !token) {
        if (!ignore) {
          setIsCartReady(true)
        }
        return
      }

      try {
        const response = await fetch(apiUrl('/api/cart'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json().catch(() => ({}))

        if (!ignore && response.ok && Array.isArray(data.items)) {
          setCartItems(data.items.map((item) => normalizeCartItem(item)).filter(Boolean))
        }
      } catch (error) {
        console.warn('Unable to load cart from backend:', error?.message || error)
      } finally {
        if (!ignore) {
          setIsCartReady(true)
        }
      }
    }

    setIsCartReady(false)
    fetchBackendCart()

    return () => {
      ignore = true
    }
  }, [authStateKey])

  useEffect(() => {
    if (!isCartReady || !isAuthenticated()) {
      return
    }

    const token = getAccessToken()
    if (!token) {
      return
    }

    if (cartSyncTimeoutRef.current) {
      clearTimeout(cartSyncTimeoutRef.current)
    }

    cartSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(apiUrl('/api/cart'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: cartItems.map((item) => normalizeCartItem(item)).filter(Boolean),
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          console.warn('Backend cart sync failed:', data?.message || response.status)
        }
      } catch (error) {
        console.warn('Backend cart sync error:', error?.message || error)
      }
    }, 250)

    return () => {
      if (cartSyncTimeoutRef.current) {
        clearTimeout(cartSyncTimeoutRef.current)
      }
    }
  }, [cartItems, isCartReady, authStateKey])

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

  function handleToggleWishlist(product) {
    const normalizedProduct = normalizeCartItem({ ...product, quantity: 1 })

    if (!normalizedProduct) {
      return
    }

    setWishlistItems((previous) => {
      const exists = previous.some((item) => item.id === normalizedProduct.id)

      if (exists) {
        return previous.filter((item) => item.id !== normalizedProduct.id)
      }

      return [
        ...previous,
        {
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          category: normalizedProduct.category,
          image: normalizedProduct.image,
          price: normalizedProduct.price,
        },
      ]
    })
  }

  function handleRemoveFromWishlist(productId) {
    setWishlistItems((previous) => previous.filter((item) => item.id !== productId))
  }

  async function handleOrderPlaced() {
    setCartItems([])

    const token = getAccessToken()
    if (!token) {
      return
    }

    try {
      await fetch(apiUrl('/api/cart'), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.warn('Failed to clear backend cart after order:', error?.message || error)
    }
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
                cartCount={cartItems.reduce((count, item) => count + item.quantity, 0)}
                wishlistCount={wishlistItems.length}
              />
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route
              path="/products"
              element={
                <ProductsPage
                  wishlistItems={wishlistItems}
                  onToggleWishlist={handleToggleWishlist}
                />
              }
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/products/:id"
              element={
                <ProductDetailsPage
                  onAddToCart={handleAddToCart}
                  wishlistItems={wishlistItems}
                  onToggleWishlist={handleToggleWishlist}
                />
              }
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
            <Route
              path="/checkout"
              element={<CheckoutPage cartItems={cartItems} onOrderPlaced={handleOrderPlaced} />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/admin-dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="/product-tracking" element={<ProductTrackingPage />} />
            <Route
              path="/wishlist"
              element={
                <WishlistPage
                  wishlistItems={wishlistItems}
                  onRemoveFromWishlist={handleRemoveFromWishlist}
                  onAddToCart={handleAddToCart}
                />
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
