import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('isAuth')
    navigate('/login')
  }

  return (
    <section className="container section">
      <div className="dashboard-card">
        <h1>Welcome to Your Dashboard</h1>
        <p>Manage your shopping journey with a clean and professional experience.</p>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </section>
  )
}
