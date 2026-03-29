import { useParams } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import legacyProducts from './productsData'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const API_ROOT = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : ''

function apiUrl(path) {
  return `${API_ROOT}${path}`
}
const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-size="24" font-family="Arial">Image not available</text></svg>'

const legacyImageById = Object.fromEntries(legacyProducts.map((item) => [String(item.id), item.image]))
const legacyImageByFilename = Object.fromEntries(
  legacyProducts.map((item) => [
    String(item.image || '').split('?')[0].split('/').pop(),
    item.image,
  ])
)

function resolveProductImage(product) {
  const productId = String(product?.id || '')
  const originalImageValue = String(product?.image || '').trim()
  const imageValue = originalImageValue.startsWith('www.')
    ? `https://${originalImageValue}`
    : originalImageValue

  if (!imageValue) {
    return legacyImageById[productId] || ''
  }

  if (
    imageValue.startsWith('http://') ||
    imageValue.startsWith('https://') ||
    imageValue.startsWith('data:') ||
    imageValue.startsWith('blob:')
  ) {
    return imageValue
  }

  if (imageValue.startsWith('/src/')) {
    if (legacyImageById[productId]) {
      return legacyImageById[productId]
    }

    const filename = imageValue.split('?')[0].split('/').pop()
    return legacyImageByFilename[filename] || ''
  }

  return imageValue
}

export default function ProductDetailsPage({ onAddToCart }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl(`/api/products/${id}`))
      const data = await response.json()

      if (response.ok) {
        setProduct({
          ...data.product,
          image: resolveProductImage(data.product),
        })
        setError('')
      } else {
        setError('Product not found')
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  if (loading) {
    return (
      <section className="container section">
        <p style={{ padding: '40px', textAlign: 'center' }}>Loading product...</p>
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="container section">
        <h2>{error || 'Product not found'}</h2>
      </section>
    )
  }

  return (
    <section className="container section">
      <div className="pdp-layout">
        <article className="pdp-card">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              style={{ maxWidth: '100%', marginBottom: '20px' }}
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = FALLBACK_IMAGE
              }}
            />
          )}
          <p className="category">{product.category || 'Uncategorized'}</p>
          <h2>{product.name}</h2>
          {(product.offer_text || product.offer_percent) && (
            <p style={{ color: '#d9534f', fontWeight: 700, margin: '6px 0' }}>
              {product.offer_text || 'Special Offer'}
              {product.offer_percent ? ` - ${product.offer_percent}% OFF` : ''}
            </p>
          )}
          <p>{product.description}</p>
          {Number.isFinite(Number(product.stock_left)) && Number(product.stock_left) >= 0 && (
            <p style={{ color: Number(product.stock_left) <= 5 ? '#d9534f' : '#555', fontWeight: 600 }}>
              {Number(product.stock_left) <= 5
                ? `Only ${Number(product.stock_left)} products left`
                : `${Number(product.stock_left)} products left`}
            </p>
          )}
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
