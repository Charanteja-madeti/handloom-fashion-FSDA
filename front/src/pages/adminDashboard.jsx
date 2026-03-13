import { Link } from 'react-router-dom'
import products from './productsData'

export default function AdminDashboard() {
  const totalProducts = products.length
  const inStockCount = products.filter((product) => product.price > 0).length

  return (
    <section className="container section">
      <div className="dashboard-card">
        <h1>Admin Dashboard</h1>
        <p>View store summary and manage product operations from one place.</p>

        <div className="admin-summary-grid">
          <article className="admin-summary-card">
            <h3>Total Products</h3>
            <p>{totalProducts}</p>
          </article>
          <article className="admin-summary-card">
            <h3>In Stock</h3>
            <p>{inStockCount}</p>
          </article>
        </div>

        <div className="admin-actions">
          <Link className="auth-submit admin-action-link" to="/product-tracking">
            Go to Product Tracking
          </Link>
          <Link className="auth-switch admin-action-link" to="/products">
            Manage Products
          </Link>
        </div>
      </div>
    </section>
  )
}
