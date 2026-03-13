import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Header({ currentUser, onLogout, isDarkMode, onToggleTheme }) {
  const [searchText, setSearchText] = useState('')
  const navigate = useNavigate()

  function handleSearchSubmit(event) {
    event.preventDefault()
    const query = searchText.trim()

    if (!query) {
      navigate('/products')
      return
    }

    navigate(`/products?q=${encodeURIComponent(query)}`)
  }

  return (
    <header className="header">
      <div className="container nav">
        <div className="brand-block">
          <div className="brand-logo">HF</div>
          <div>
            <h1>Handloom Fashion</h1>
            <p className="brand-tagline">Fashion made by artisans</p>
          </div>
        </div>

        <form className="header-search-wrap" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            className="header-search"
            placeholder="Search for products, brands and more"
            aria-label="Global search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </form>

        <nav className="top-nav">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/checkout">Checkout</Link>
          {currentUser?.isAdmin && <Link to="/admin-dashboard">Admin Dashboard</Link>}
          {currentUser?.isAdmin && <Link to="/product-tracking">Product Tracking</Link>}
          <button type="button" className="theme-toggle" onClick={onToggleTheme}>
            {isDarkMode ? 'White Mode' : 'Dark Mode'}
          </button>
          {!currentUser ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          ) : (
            <>
              <span className="user-greeting">Hi, {currentUser.name}</span>
              <button type="button" className="link-button" onClick={onLogout}>
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
