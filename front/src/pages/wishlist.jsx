import { Link } from 'react-router-dom'

export default function WishlistPage({ wishlistItems = [], onRemoveFromWishlist, onAddToCart }) {
  return (
    <section className="container section">
      <div className="products-head">
        <h2>Wishlist</h2>
        <p className="products-count">{wishlistItems.length} items</p>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="dashboard-card">
          <p>Your wishlist is empty.</p>
          <Link to="/products" className="button-link">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid">
          {wishlistItems.map((item) => (
            <article key={item.id} className="card">
              {item.image ? <img src={item.image} alt={item.name} className="product-image" /> : null}
              <p className="category">{item.category || 'Uncategorized'}</p>
              <h3>{item.name}</h3>
              <p className="price">Rs{item.price}</p>

              <div className="wishlist-actions">
                <button type="button" onClick={() => onAddToCart?.(item)}>
                  Add to Basket
                </button>
                <button
                  type="button"
                  className="wishlist-remove"
                  onClick={() => onRemoveFromWishlist?.(item.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
