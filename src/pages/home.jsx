import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

  const homeCategories = [
    { label: 'For You', query: 'trending' },
    { label: 'Fashion', query: 'fashion' },
    { label: 'Mobiles', query: 'mobiles' },
    { label: 'Beauty', query: 'beauty' },
    { label: 'Electronics', query: 'electronics' },
    { label: 'Home', query: 'home' },
    { label: 'Appliances', query: 'appliances' },
    { label: 'Toys', query: 'toys' },
    { label: 'Food', query: 'food' },
    { label: 'Auto', query: 'auto' },
    { label: 'Books', query: 'books' },
    { label: 'Furniture', query: 'furniture' },
  ]

  const promoSlides = [
    {
      id: 'slide-men',
      title: "Men's sandals",
      subtitle: 'From Rs129',
      caption: 'Time to shop is now',
      className: 'promo-slide promo-sandals',
      query: 'men footwear',
    },
    {
      id: 'slide-ac',
      title: 'WindFree AC',
      subtitle: 'From Rs4,800/mo',
      caption: 'Energy saving cooling offers',
      className: 'promo-slide promo-ac',
      query: 'air conditioner',
    },
  ]

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
    <section className="container section homepage-v2">
      <div className="homepage-categories" aria-label="Home categories">
        {homeCategories.map((category) => (
          <Link
            key={category.label}
            to={`/products?q=${encodeURIComponent(category.query)}`}
            className="homepage-category-item"
          >
            <span className="homepage-category-icon" aria-hidden="true">
              {category.label.slice(0, 2).toUpperCase()}
            </span>
            <span className="homepage-category-label">{category.label}</span>
          </Link>
        ))}
      </div>

      <div className="homepage-hero-grid">
        <div className="homepage-hero-main" role="region" aria-label="Featured offers">
          {promoSlides.map((slide) => (
            <Link
              key={slide.id}
              to={`/products?q=${encodeURIComponent(slide.query)}`}
              className={slide.className}
            >
              <div className="promo-copy">
                <p className="promo-title">{slide.title}</p>
                <p className="promo-subtitle">{slide.subtitle}</p>
                <p className="promo-caption">{slide.caption}</p>
              </div>
            </Link>
          ))}

          <div className="promo-dots" aria-hidden="true">
            <span className="promo-dot active" />
            <span className="promo-dot" />
            <span className="promo-dot" />
            <span className="promo-dot" />
          </div>
        </div>

        <Link to="/products?q=water%20purifier" className="promo-side-card">
          <p className="promo-side-brand">Aquaguard</p>
          <p className="promo-side-headline">2 year filter life</p>
          <p className="promo-side-offer">Up to 60% Off</p>
          <p className="promo-side-note">Save up to Rs18,000 on select models</p>
        </Link>
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
                  <img
                    src={product.image || FALLBACK_IMAGE}
                    alt={product.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = FALLBACK_IMAGE
                    }}
                  />
                  <div className="category-product-meta">
                    <p className="category-product-text">{product.name}</p>
                    {typeof product.price === 'number' ? (
                      <p className="category-product-price">Rs{product.price}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
