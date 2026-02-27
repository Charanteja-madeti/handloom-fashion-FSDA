import { Link } from 'react-router-dom'

export default function CartPage({
  cartItems,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveFromCart,
}) {
  const totalAmount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)

  if (cartItems.length === 0) {
    return (
      <section className="container section">
        <h2>Your Cart</h2>
        <p>Your cart is empty. Add products to continue.</p>
        <Link to="/products" className="button-link">
          Go to Products
        </Link>
      </section>
    )
  }

  return (
    <section className="container section">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <p>Review items before checkout</p>
      </div>
      <div className="cart-list">
        {cartItems.map((item) => (
          <article key={item.id} className="cart-item">
            <div className="cart-item-info">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-image"
                  width={150}
                  height={150}
                  style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '6px' }}
                />
              ) : (
                <div
                  className="cart-item-image cart-item-image-fallback"
                  style={{ width: '150px', height: '150px', borderRadius: '6px' }}
                >
                  {item.name}
                </div>
              )}
              <div>
                <h3>{item.name}</h3>
                <p className="category">{item.category}</p>
                <p className="price">₹{item.price}</p>
              </div>
            </div>
            <div className="quantity-controls">
              <button type="button" onClick={() => onDecreaseQuantity(item.id)}>
                -
              </button>
              <span>{item.quantity}</span>
              <button type="button" onClick={() => onIncreaseQuantity(item.id)}>
                +
              </button>
              <button type="button" onClick={() => onRemoveFromCart(item.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="cart-summary">
        <p className="cart-total-label">Total Amount</p>
        <p className="price">₹{totalAmount}</p>
        <Link to="/checkout" className="button-link cart-cta">
          Proceed to Checkout
        </Link>
      </div>
    </section>
  )
}
