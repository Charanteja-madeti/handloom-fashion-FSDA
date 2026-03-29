import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from './auth'

export default function Dashboard() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logoutUser()
    navigate('/login')
  }

  return (
    <section className="container section">
      <div className="dashboard-card">
        <h1>Welcome to Your Dashboard</h1>
        <p>Manage your shopping journey with a clean and professional experience.</p>
        <div className="admin-actions" style={{ marginBottom: '12px' }}>
          <Link className="auth-submit admin-action-link nav-link-with-icon tracking-link" to="/product-tracking">
            <span className="nav-icon" aria-hidden="true">TR</span>
            <span>My Ordered Products</span>
          </Link>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </section>
  )
}
