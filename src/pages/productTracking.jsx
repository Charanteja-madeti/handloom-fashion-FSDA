import products from './productsData'

const statusFlow = ['Packed', 'Shipped', 'Out for Delivery', 'Delivered']

function getTrackingStatus(productId) {
  const numericId = Number(productId)
  const index = Number.isNaN(numericId) ? 0 : numericId % statusFlow.length
  return statusFlow[index]
}

export default function ProductTrackingPage() {
  return (
    <section className="container section">
      <div className="dashboard-card">
        <h1>Product Tracking</h1>
        <p>Track live progress of products currently in the fulfillment pipeline.</p>

        <div className="tracking-table-wrap">
          <table className="tracking-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{getTrackingStatus(product.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
