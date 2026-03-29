import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function getStoredPhone(email) {
  if (!email) {
    return ''
  }

  return localStorage.getItem(`user_phone_${String(email).trim().toLowerCase()}`) || ''
}

function formatCount(value) {
  const numericValue = Number(value || 0)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0'
  }

  if (numericValue > 99) {
    return '99+'
  }

  return String(Math.round(numericValue))
}

export default function Header({
  currentUser,
  onLogout,
  isDarkMode,
  onToggleTheme,
  cartCount = 0,
  wishlistCount = 0,
}) {
  const [searchText, setSearchText] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const profilePhoneInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  function savePhone() {
    const emailKey = String(currentUser?.email || '').trim().toLowerCase()

    if (!emailKey) {
      return
    }

    const phoneValue = String(profilePhoneInputRef.current?.value || '').trim()
    localStorage.setItem(`user_phone_${emailKey}`, phoneValue)
  }

  function closeMenuAndNavigate(path) {
    setIsMenuOpen(false)
    navigate(path)
  }

  const userInitial = String(currentUser?.name || 'U').trim().charAt(0).toUpperCase() || 'U'

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
        <button
          type="button"
          className="icon-only-button menu-button"
          aria-label="Open menu"
          title="Menu"
          onClick={() => setIsMenuOpen(true)}
        >
          ☰
        </button>

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

        <nav className="header-icons-only" aria-label="Quick actions">
          <Link to="/wishlist" className="icon-only-link" title="Wishlist" aria-label="Wishlist">
            ♡
            {wishlistCount > 0 ? <span className="icon-count-badge">{formatCount(wishlistCount)}</span> : null}
          </Link>
          <Link to="/cart" className="icon-only-link" title="Basket" aria-label="Basket">
            🧺
            {cartCount > 0 ? <span className="icon-count-badge">{formatCount(cartCount)}</span> : null}
          </Link>
        </nav>
      </div>

      {isMenuOpen ? (
        <>
          <button
            type="button"
            className="menu-overlay"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="side-menu" aria-label="Main menu">
            <div className="side-menu-head">
              <div className="side-menu-userhead">
                <div className="profile-avatar" aria-hidden="true">
                  {userInitial}
                </div>
                <div>
                  <h2>Menu</h2>
                  <p className="side-menu-subtitle">{currentUser?.name || 'User Profile'}</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-only-button"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
              >
                ✕
              </button>
            </div>

            <section className="menu-section">
              <h3>1. Profile</h3>
              <p><strong>Name:</strong> {currentUser?.name || 'User'}</p>
              <p><strong>Email:</strong> {currentUser?.email || '-'}</p>
              <label className="menu-label" htmlFor="profile-phone">
                User phone number (editable)
              </label>
              <input
                key={String(currentUser?.email || 'guest').trim().toLowerCase() || 'guest'}
                id="profile-phone"
                ref={profilePhoneInputRef}
                className="menu-input"
                type="tel"
                defaultValue={getStoredPhone(currentUser?.email)}
                placeholder="Enter phone number"
              />
              <button type="button" className="menu-action" onClick={savePhone}>
                Save Phone
              </button>
            </section>

            <section className="menu-section">
              <button type="button" className="menu-row-link" onClick={() => closeMenuAndNavigate('/product-tracking')}>
                2. Orders
              </button>
              {currentUser?.isAdmin ? (
                <button
                  type="button"
                  className="menu-row-link"
                  onClick={() => closeMenuAndNavigate('/admin-dashboard')}
                >
                  Admin Portal
                </button>
              ) : null}
              <div className="menu-setting-row">
                <span>3. Setting - Mode</span>
                <button
                  type="button"
                  className="menu-action"
                  onClick={onToggleTheme}
                >
                  {isDarkMode ? 'Light' : 'Dark'}
                </button>
              </div>
              <button type="button" className="menu-row-link" onClick={() => closeMenuAndNavigate('/wishlist')}>
                4. Wishlist
              </button>
              <button
                type="button"
                className="menu-row-link danger"
                onClick={() => {
                  setIsMenuOpen(false)
                  onLogout?.()
                }}
              >
                5. Log Out
              </button>
            </section>
          </aside>
        </>
      ) : null}
    </header>
  )
}
