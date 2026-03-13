import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { clearCurrentUser, readCurrentUser, saveCurrentUser } from './auth'
import CartPage from './cart'
import CheckoutPage from './checkout'
import ContactPage from './contact'
import Header from './header'
import HomePage from './home'
import LoginPage from './login'
import ProductDetailsPage from './productdetails'
import ProductsPage from './products'
import ProtectedRoute from './protectedroute'
import SignupPage from './signup'

export default function Pages() {
  const [currentUser, setCurrentUser] = useState(() => readCurrentUser())

  function handleLogin(user) {
    saveCurrentUser(user)
    setCurrentUser(user)
  }

  function handleLogout() {
    clearCurrentUser()
    setCurrentUser(null)
  }

  return (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
