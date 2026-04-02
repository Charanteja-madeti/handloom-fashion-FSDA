import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import legacyProducts from './productsData'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'https://handloom-fashion-fsda.onrender.com').trim()
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

export default function HomePage() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(apiUrl('/api/products'))
        const data = await response.json()
        if (response.ok) {
          const nextProducts = (data.products || [])
            .map((product) => ({
              ...product,
              image: resolveProductImage(product),
            }))

          if (nextProducts.length > 0) {
            setProducts(nextProducts)
            return
          }
        }

        // Fallback to bundled products so home page never appears empty.
        setProducts(
          legacyProducts.map((product) => ({
            ...product,
            image: resolveProductImage(product),
            offer_text: product.offer_text || null,
            offer_percent: product.offer_percent || null,
          }))
        )
      } catch (err) {
        console.error('Error fetching products:', err)

        setProducts(
          legacyProducts.map((product) => ({
            ...product,
            image: resolveProductImage(product),
            offer_text: product.offer_text || null,
            offer_percent: product.offer_percent || null,
          }))
        )
      }
    }
    fetchProducts()
  }, [])

  const featuredProducts = products.slice(0, 5)

  const categorizedProducts = products.reduce((accumulator, product) => {
    const normalizedCategory = String(product.category || '').trim().toLowerCase()
    const categoryKey = normalizedCategory || 'uncategorized'
    const displayName =
      categoryKey === 'uncategorized'
        ? 'Uncategorized'
        : String(product.category || '').trim()

    if (!accumulator[categoryKey]) {
      accumulator[categoryKey] = {
        displayName,
        items: [],
      }
    }

    accumulator[categoryKey].items.push(product)
    return accumulator
  }, {})

  return (
    <section className="container section">
      <div className="hero-panel">
        <div>
          <p className="hero-tag">Trending Handloom Collection</p>
          <h2>Style Meets Tradition</h2>
          <p>
            Discover curated handloom fashion inspired by India&apos;s weaving heritage with
            trusted quality and fast delivery.
          </p>
          <Link to="/products" className="button-link">
            Shop Now
          </Link>
        </div>
      </div>

      <div className="home-categories">
        <article className="quick-card">
          <h3>Women&apos;s Wear</h3>
          <p>Sarees, kurtas and festive essentials at great prices.</p>
        </article>
        <article className="quick-card">
          <h3>Men&apos;s Collection</h3>
          <p>Shirts, kurtas and ethnic styles for everyday comfort.</p>
        </article>
        <article className="quick-card">
          <h3>Home Textiles</h3>
          <p>Premium handloom bedsheets, table linen and décor picks.</p>
        </article>
        <article className="quick-card">
          <h3>New Arrivals</h3>
          <p>Fresh drops from artisan clusters across the country.</p>
        </article>
      </div>

      <div className="scroll-section">
        <h3>Featured Products</h3>
        {featuredProducts.length > 0 ? (
          <div className="marquee-wrapper">
            <div className="horizontal-scroll">
              {[...featuredProducts, ...featuredProducts].map((product, index) => (
                <div key={`${product.id}-${index}`} className="scroll-card">
                  <div className="scroll-card-text">{product.name}</div>
                  {(product.offer_text || product.offer_percent) && (
                    <div className="scroll-card-offer">
                      {product.offer_text || 'Special Offer'}
                      {product.offer_percent ? ` - ${product.offer_percent}% OFF` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>No featured products available right now.</p>
        )}
      </div>

      <div className="home-product-categories">
        <h3>Shop by Categories</h3>
        {Object.values(categorizedProducts).map((categoryGroup) => (
          <article key={categoryGroup.displayName} className="category-block">
            <div className="category-block-head">
              <h4>{categoryGroup.displayName}</h4>
              <Link to={`/products?q=${encodeURIComponent(categoryGroup.displayName)}`} className="button-link">
                View All
              </Link>
            </div>

            <div className="category-products-row">
              {categoryGroup.items.slice(0, 8).map((product) => (
                <div key={`${categoryGroup.displayName}-${product.id}`} className="category-product-tile">
                  <div className="category-product-text">{product.name}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
