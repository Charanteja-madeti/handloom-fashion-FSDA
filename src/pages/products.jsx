import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import products from './productsData'

export default function ProductsPage() {
  const [searchParams] = useSearchParams()
  const queryFromUrl = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(queryFromUrl)
  const [sortOrder, setSortOrder] = useState('default')

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
  }, [searchTerm])

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
            <img src={product.image} alt={product.name} className="product-image" />
            <p className="category">{product.category}</p>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p className="price">₹{product.price}</p>
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
