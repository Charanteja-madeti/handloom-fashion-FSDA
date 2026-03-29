import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

function getDiscountedPrice(product) {
  const rawPrice = Number(product?.price)
  const rawOfferPercent = Number(product?.offer_percent)

  if (!Number.isFinite(rawPrice)) {
    return null
  }

  if (!Number.isFinite(rawOfferPercent) || rawOfferPercent <= 0) {
    return null
  }

  return Math.max(0, Math.round(rawPrice * (1 - rawOfferPercent / 100)))
}

export default function ProductsPage() {
  const [searchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(queryFromUrl)
  const [sortOrder, setSortOrder] = useState('default')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProducts()

    const onFocus = () => {
      fetchProducts()
    }

    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(apiUrl(`/api/products?ts=${Date.now()}`), {
        cache: 'no-store',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(`API Error: ${response.status} - ${data.message || 'Unknown error'}`)
        return
      }

      setProducts((data.products || []).map((product) => ({
        ...product,
        image: resolveProductImage(product),
      })))
      setError('')
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(`Failed to load products: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSearchTerm(queryFromUrl)
  }, [queryFromUrl])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return products
    }

    return products.filter((product) => {
      const searchableText = `${product.name} ${product.category} ${product.description}`.toLowerCase()
      return searchableText.includes(normalizedSearch)
    })
  }, [searchTerm, products])

  const displayedProducts = useMemo(() => {
    const sortedProducts = [...filteredProducts]

    if (sortOrder === 'price-low-to-high') {
      sortedProducts.sort((a, b) => a.price - b.price)
    }

    if (sortOrder === 'price-high-to-low') {
      sortedProducts.sort((a, b) => b.price - a.price)
    }

    return sortedProducts
  }, [filteredProducts, sortOrder])

  if (loading) {
    return (
      <section className="container section">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading products...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="container section">
        <div style={{
          padding: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      </section>
    )
  }

  return (
    <section className="container section">
      <div className="products-head">
        <h2>Products</h2>
        <p className="products-count">{filteredProducts.length} items</p>
      </div>
      <div className="products-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search by product name, category, or description"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="sort-select"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          aria-label="Sort products by price"
        >
          <option value="default">Sort: Recommended</option>
          <option value="price-low-to-high">Price: Low to High</option>
          <option value="price-high-to-low">Price: High to Low</option>
        </select>
      </div>
      <div className="grid">
        {displayedProducts.map((product) => (
          <article key={product.id} className="card">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="product-image"
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = FALLBACK_IMAGE
                }}
              />
            )}
            <p className="category">{product.category || 'Uncategorized'}</p>
            <h3>{product.name}</h3>
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
            {getDiscountedPrice(product) !== null ? (
              <p className="price">
                <span style={{ textDecoration: 'line-through', color: '#777', marginRight: '8px' }}>
                  ₹{product.price}
                </span>
                <span style={{ color: '#d9534f', fontWeight: 700 }}>
                  ₹{getDiscountedPrice(product)}
                </span>
              </p>
            ) : (
              <p className="price">₹{product.price}</p>
            )}
            <Link to={`/products/${product.id}`} className="button-link">
              View Product
            </Link>
          </article>
        ))}
      </div>
      {displayedProducts.length === 0 && (
        <p className="search-empty">No products found for your search.</p>
      )}
    </section>
  )
}
