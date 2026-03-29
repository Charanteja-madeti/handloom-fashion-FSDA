import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAccessToken } from './auth'

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const API_BASE_URL = configuredApiBaseUrl.endsWith('/')
  ? configuredApiBaseUrl.slice(0, -1)
  : configuredApiBaseUrl

function apiUrl(path) {
  return `${API_BASE_URL}${path}`
}

function normalizeImageInput(imageValue) {
  const trimmedImage = String(imageValue || '').trim()

  if (!trimmedImage) {
    return ''
  }

  if (trimmedImage.startsWith('www.')) {
    return `https://${trimmedImage}`
  }

  return trimmedImage
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function AdminDashboard() {
  const [products, setProducts] = useState([])
  const [offerDrafts, setOfferDrafts] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image: '',
    offerText: '',
    offerPercent: '',
    stockLeft: ''
  })
  const [loading, setLoading] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState(null)
  const [savingOfferProductId, setSavingOfferProductId] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(apiUrl('/api/products'))
      const data = await response.json()
      const nextProducts = data.products || []
      setProducts(nextProducts)
      setOfferDrafts(
        nextProducts.reduce((accumulator, product) => {
          accumulator[product.id] = {
            price: '',
            offerText: product.offer_text || '',
            offerPercent: product.offer_percent ?? '',
            stockLeft: product.stock_left ?? ''
          }
          return accumulator
        }, {})
      )
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const token = getAccessToken()

      if (!token) {
        setMessage('Please login first to add products')
        setMessageType('error')
        setLoading(false)
        return
      }

      const response = await fetch(apiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          image: normalizeImageInput(formData.image),
          offerText: formData.offerText,
          offerPercent: formData.offerPercent,
          stockLeft: formData.stockLeft
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Product added successfully!')
        setMessageType('success')
        setFormData({
          name: '',
          description: '',
          price: '',
          category: '',
          image: '',
          offerText: '',
          offerPercent: '',
          stockLeft: ''
        })
        fetchProducts()
      } else {
        setMessage(data.message || 'Failed to add product')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error adding product:', error)
      setMessage('Error adding product. Please try again.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleOfferDraftChange = (productId, field, value) => {
    setOfferDrafts((previous) => ({
      ...previous,
      [productId]: {
        ...(previous[productId] || {}),
        [field]: value
      }
    }))
  }

  const handleSaveOfferStock = async (productId) => {
    try {
      setSavingOfferProductId(productId)
      setMessage('')

      const token = getAccessToken()

      const currentDraft = offerDrafts[productId] || {}
      const currentProduct = products.find((product) => String(product.id) === String(productId))

      if (!currentProduct) {
        setMessage('Product not found in current list. Please refresh and try again.')
        setMessageType('error')
        return
      }

      const normalizedPayload = {
        price: normalizeOptionalNumber(currentDraft.price),
        offerText: String(currentDraft.offerText || '').trim(),
        offerPercent: normalizeOptionalNumber(currentDraft.offerPercent),
        stockLeft: normalizeOptionalNumber(currentDraft.stockLeft)
      }

      const response = await fetch(apiUrl(`/api/products/${productId}/offer-stock`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(normalizedPayload)
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setMessage('Session expired. Please login again and retry.')
          setMessageType('error')
          return
        }

        const fallbackPrice =
          normalizedPayload.price !== null
            ? normalizedPayload.price
            : Number.isFinite(normalizedPayload.offerPercent) && normalizedPayload.offerPercent > 0
              ? Number((Number(currentProduct.price) * (1 - normalizedPayload.offerPercent / 100)).toFixed(2))
              : Number(currentProduct.price)

        const fallbackResponse = await fetch(apiUrl(`/api/products/${productId}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            name: currentProduct.name,
            description: currentProduct.description || '',
            price: fallbackPrice,
            category: currentProduct.category || '',
            image: normalizeImageInput(currentProduct.image || ''),
            offerText: normalizedPayload.offerText,
            offerPercent: normalizedPayload.offerPercent,
            stockLeft: normalizedPayload.stockLeft
          })
        })

        const fallbackData = await fallbackResponse.json()
        if (!fallbackResponse.ok) {
          setMessage(fallbackData.message || data.message || 'Failed to update offer/stock')
          setMessageType('error')
          return
        }
      }

      setMessage('Price, offer, and stock updated successfully!')
      setMessageType('success')
      fetchProducts()
    } catch (error) {
      console.error('Error updating offer/stock:', error)
      setMessage('Error updating offer/stock. Please try again.')
      setMessageType('error')
    } finally {
      setSavingOfferProductId(null)
    }
  }

  const handleDeleteProduct = async (productId, productName) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${productName}"?`)

    if (!confirmed) {
      return
    }

    try {
      setDeletingProductId(productId)
      setMessage('')

      const token = getAccessToken()

      const response = await fetch(apiUrl(`/api/products/${productId}`), {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Product deleted successfully!')
        setMessageType('success')
        fetchProducts()
      } else {
        setMessage(data.message || 'Failed to delete product')
        setMessageType('error')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      setMessage('Error deleting product. Please try again.')
      setMessageType('error')
    } finally {
      setDeletingProductId(null)
    }
  }

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
          <Link className="auth-submit admin-action-link" to="/products">
            Manage Products
          </Link>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid #ddd' }}>
          <h2>Add New Product</h2>

          {message && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '20px',
              borderRadius: '4px',
              backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
              color: messageType === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter product name"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="description" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter product description"
                rows="4"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Arial, sans-serif',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="price" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Price (₹) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                placeholder="Enter price"
                step="0.01"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="category" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Enter category (e.g., Clothing, Textiles)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="image" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Image URL
              </label>
              <input
                type="text"
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="Enter direct image URL (e.g. https://...jpg)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="offerText" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Offer Text
              </label>
              <input
                type="text"
                id="offerText"
                name="offerText"
                value={formData.offerText}
                onChange={handleInputChange}
                placeholder="Example: Festival Sale"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="offerPercent" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Offer Percentage
              </label>
              <input
                type="number"
                id="offerPercent"
                name="offerPercent"
                value={formData.offerPercent}
                onChange={handleInputChange}
                placeholder="Example: 25"
                min="0"
                max="100"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label htmlFor="stockLeft" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Stock Left
              </label>
              <input
                type="number"
                id="stockLeft"
                name="stockLeft"
                value={formData.stockLeft}
                onChange={handleInputChange}
                placeholder="Example: 4"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s'
              }}
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid #ddd' }}>
          <h2>Delete Products</h2>
          <p style={{ marginBottom: '16px' }}>Update price, offers, and stock anytime and remove products from the store catalog.</p>

          <div style={{ display: 'grid', gap: '12px' }}>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px'
                }}
              >
                <div>
                  <strong>{product.name}</strong>
                  <p style={{ margin: '4px 0 0', color: '#666' }}>₹{product.price}</p>
                </div>

                <div style={{ display: 'grid', gap: '8px', width: '380px' }}>
                  <input
                    type="text"
                    value={offerDrafts[product.id]?.offerText ?? ''}
                    onChange={(event) => handleOfferDraftChange(product.id, 'offerText', event.target.value)}
                    placeholder="Offer text"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '8px' }}>
                    <input
                      type="number"
                      value={offerDrafts[product.id]?.price ?? ''}
                      onChange={(event) => handleOfferDraftChange(product.id, 'price', event.target.value)}
                      placeholder={`Price (current: ${product.price})`}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />

                    <input
                      type="number"
                      value={offerDrafts[product.id]?.offerPercent ?? ''}
                      onChange={(event) => handleOfferDraftChange(product.id, 'offerPercent', event.target.value)}
                      placeholder="Offer %"
                      min="0"
                      max="100"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />

                    <input
                      type="number"
                      value={offerDrafts[product.id]?.stockLeft ?? ''}
                      onChange={(event) => handleOfferDraftChange(product.id, 'stockLeft', event.target.value)}
                      placeholder="Stock left"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleSaveOfferStock(product.id)}
                      disabled={savingOfferProductId === product.id}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: savingOfferProductId === product.id ? '#ccc' : '#0d6efd',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingOfferProductId === product.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {savingOfferProductId === product.id ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      disabled={deletingProductId === product.id}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: deletingProductId === product.id ? '#ccc' : '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: deletingProductId === product.id ? 'not-allowed' : 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {deletingProductId === product.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <p style={{ color: '#666' }}>No products available to delete.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
