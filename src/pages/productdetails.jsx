import { useParams } from 'react-router-dom'
import products from './productsData'

export default function ProductDetailsPage({ onAddToCart }) {
  const { id } = useParams()
  const product = products.find((item) => item.id === id)

  if (!product) {
    return (
      <section className="container section">
        <h2>Product not found</h2>
      </section>
    )
  }

  return (
    <section className="container section">
      <div className="pdp-layout">
        <article className="pdp-card">
          <p className="category">{product.category}</p>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p className="price">₹{product.price}</p>

          <div className="pdp-actions">
            <button
              type="button"
              onClick={() => {
                if (typeof onAddToCart === 'function') {
                  onAddToCart(product)
                  alert('Added to cart')
                } else {
                  alert('Cart is not enabled yet in this page flow.')
                }
              }}
            >
              Add to Cart
            </button>
          </div>
        </article>

        <aside className="delivery-card">
          <h3>Delivery Details</h3>
          <p>
            <strong>Estimated Delivery:</strong> 3-5 business days
          </p>
          <p>
            <strong>Shipping:</strong> Free delivery on orders above ₹999, else ₹49
          </p>
          <p>
            <strong>Payment Options:</strong> UPI, Cards, Net Banking, and Cash on Delivery
          </p>
          <p>
            <strong>Returns:</strong> 7-day easy return for eligible products
          </p>
        </aside>
      </div>
    </section>
  )
}
