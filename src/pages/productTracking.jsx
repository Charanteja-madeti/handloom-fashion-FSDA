import { useEffect, useMemo, useState } from 'react'
import { getAccessToken, getCurrentUser } from './auth'

const TRACKING_STATUS_OPTIONS = [
  'Order Placed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Delayed',
  'Cancelled',
]

const TIMELINE_STEPS = ['Order Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const API_ROOT = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : configuredApiBaseUrl

function apiUrl(path) {
  return `${API_ROOT}${path}`
}

function toInputDate(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 10)
}

export default function ProductTrackingPage() {
  const currentUser = getCurrentUser()
  const normalizedUserEmail = String(currentUser?.email || '').trim().toLowerCase()
  const isAdmin = currentUser?.role === 'admin' || normalizedUserEmail === 'admin@handloom.com'
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [cancelingOrderId, setCancelingOrderId] = useState(null)
  const [adminFilters, setAdminFilters] = useState({
    query: '',
    status: 'all',
  })

  async function fetchOrders() {
    try {
      setLoading(true)
      setError('')

      const token = getAccessToken()
      if (!token) {
        setError('Please login first to view tracking details.')
        return
      }

      const response = await fetch(apiUrl('/api/orders'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.message || 'Unable to fetch tracking details.')
        return
      }

      setOrders(data.orders || [])
    } catch {
      setError('Unable to fetch tracking details right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    let scopedOrders = isAdmin
      ? orders
      : orders.filter(
          (order) => String(order.customer_email || '').trim().toLowerCase() === normalizedUserEmail,
        )

    if (!isAdmin) {
      return scopedOrders
    }

    const query = String(adminFilters.query || '').trim().toLowerCase()
    const status = String(adminFilters.status || 'all').trim().toLowerCase()

    if (query) {
      scopedOrders = scopedOrders.filter((order) => {
        const orderCode = String(order.order_code || '').toLowerCase()
        const email = String(order.customer_email || '').toLowerCase()
        const customerName = String(order.customer_name || '').toLowerCase()
        return orderCode.includes(query) || email.includes(query) || customerName.includes(query)
      })
    }

    if (status !== 'all') {
      scopedOrders = scopedOrders.filter(
        (order) => String(order.tracking_status || '').trim().toLowerCase() === status,
      )
    }

    return scopedOrders
  }, [adminFilters.query, adminFilters.status, isAdmin, normalizedUserEmail, orders])

  function timelineStateForStep(status, step) {
    const normalizedStatus = String(status || '').trim().toLowerCase()
    if (normalizedStatus === 'cancelled') {
      return step === 'Order Placed' ? 'done' : 'pending'
    }

    if (normalizedStatus === 'delayed') {
      const shippedIndex = TIMELINE_STEPS.indexOf('Shipped')
      const stepIndex = TIMELINE_STEPS.indexOf(step)
      if (stepIndex <= shippedIndex) {
        return 'done'
      }
      return 'pending'
    }

    const currentIndex = TIMELINE_STEPS.findIndex(
      (timelineStep) => timelineStep.toLowerCase() === normalizedStatus,
    )
    const stepIndex = TIMELINE_STEPS.indexOf(step)

    if (currentIndex === -1) {
      return step === 'Order Placed' ? 'active' : 'pending'
    }

    if (stepIndex < currentIndex) {
      return 'done'
    }

    if (stepIndex === currentIndex) {
      return 'active'
    }

    return 'pending'
  }

  async function cancelOrder(order) {
    const canCancelStatuses = ['order placed', 'packed']
    const currentStatus = String(order.tracking_status || '').trim().toLowerCase()
    if (!canCancelStatuses.includes(currentStatus)) {
      setMessage({
        type: 'error',
        text: `This order cannot be cancelled after status: ${order.tracking_status}`,
      })
      return
    }

    const confirmation = window.confirm(`Cancel order ${order.order_code}?`)
    if (!confirmation) {
      return
    }

    try {
      setCancelingOrderId(order.id)
      setMessage({ type: '', text: '' })

      const token = getAccessToken()
      const response = await fetch(apiUrl(`/api/orders/${order.id}/cancel`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Cancelled by customer from tracking page' }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage({ type: 'error', text: data?.message || 'Unable to cancel order.' })
        return
      }

      setMessage({ type: 'success', text: 'Order cancelled successfully.' })
      await fetchOrders()
    } catch {
      setMessage({ type: 'error', text: 'Unable to cancel order at the moment.' })
    } finally {
      setCancelingOrderId(null)
    }
  }

  function startEditing(order) {
    setEditingOrderId(order.id)
    setDraft({
      customerName: order.customer_name || '',
      customerEmail: order.customer_email || '',
      phone: order.phone || '',
      alternatePhone: order.alternate_phone || '',
      address: order.address || '',
      nearbyLocation: order.nearby_location || '',
      city: order.city || '',
      district: order.district || '',
      state: order.state || '',
      pincode: order.pincode || '',
      trackingStatus: order.tracking_status || 'Order Placed',
      courierName: order.courier_name || '',
      trackingNumber: order.tracking_number || '',
      currentLocation: order.current_location || '',
      estimatedDelivery: toInputDate(order.estimated_delivery),
      deliveryNotes: order.delivery_notes || '',
    })
    setMessage({ type: '', text: '' })
  }

  function cancelEditing() {
    setEditingOrderId(null)
    setDraft(null)
  }

  function handleDraftChange(event) {
    const { name, value } = event.target
    setDraft((previous) => ({ ...previous, [name]: value }))
  }

  async function saveOrder(orderId) {
    if (!draft) {
      return
    }

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const token = getAccessToken()
      const response = await fetch(apiUrl(`/api/orders/${orderId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage({ type: 'error', text: data?.message || 'Failed to update order.' })
        return
      }

      setMessage({ type: 'success', text: 'Order details updated successfully.' })
      cancelEditing()
      await fetchOrders()
    } catch {
      setMessage({ type: 'error', text: 'Failed to update order details.' })
    } finally {
      setSaving(false)
    }
  }

  async function copyText(value) {
    const safeValue = String(value || '').trim()

    if (!safeValue) {
      setMessage({ type: 'error', text: 'Nothing to copy.' })
      return
    }

    try {
      await navigator.clipboard.writeText(safeValue)
      setMessage({ type: 'success', text: 'Copied to clipboard.' })
    } catch {
      setMessage({ type: 'error', text: 'Unable to copy details.' })
    }
  }

  return (
    <section className="container section">
      <div className="dashboard-card">
        <h1>{isAdmin ? 'Admin Product Tracking' : 'My Ordered Products'}</h1>
        <p>
          {isAdmin
            ? 'View and edit delivery details for every customer order.'
            : 'View tracking details only for products ordered with your login email.'}
        </p>

        {message.text ? <p className={`checkout-message ${message.type}`}>{message.text}</p> : null}
        {error ? <p className="checkout-message error">{error}</p> : null}

        {isAdmin ? (
          <div className="tracking-filter-bar">
            <input
              className="tracking-input"
              type="search"
              placeholder="Search by order code, customer name, or email"
              value={adminFilters.query}
              onChange={(event) =>
                setAdminFilters((previous) => ({ ...previous, query: event.target.value }))
              }
            />
            <select
              className="tracking-input"
              value={adminFilters.status}
              onChange={(event) =>
                setAdminFilters((previous) => ({ ...previous, status: event.target.value }))
              }
            >
              <option value="all">All Status</option>
              {TRACKING_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status.toLowerCase()}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {loading ? (
          <p>Loading tracking details...</p>
        ) : filteredOrders.length === 0 ? (
          <p>No orders found for this account.</p>
        ) : (
          <div className="tracking-cards">
            {filteredOrders.map((order) => {
              const isEditing = editingOrderId === order.id && draft

              return (
                <article key={order.id} className="tracking-order-card">
                  <div className="tracking-order-head">
                    <h3>{order.order_code}</h3>
                    <p className="tracking-order-status">{order.tracking_status}</p>
                  </div>

                  <p className="tracking-order-meta">
                    Ordered on {new Date(order.created_at).toLocaleString()} | Submitted at{' '}
                    {order.submitted_at || '-'} | Total Rs{order.total_amount} | Payment {order.payment_method || 'COD'} ({order.payment_status || 'Pending'})
                  </p>

                  {order.payment_reference ? (
                    <p className="tracking-order-meta">Payment Ref: {order.payment_reference}</p>
                  ) : null}

                  {order.payment_app ? (
                    <p className="tracking-order-meta">UPI App: {order.payment_app}</p>
                  ) : null}

                  {order.payer_upi_id ? (
                    <p className="tracking-order-meta">Payer UPI ID: {order.payer_upi_id}</p>
                  ) : null}

                  <div className="tracking-timeline" aria-label="Order tracking timeline">
                    {TIMELINE_STEPS.map((step) => {
                      const stepState = timelineStateForStep(order.tracking_status, step)
                      return (
                        <div key={`${order.id}-${step}`} className={`timeline-step ${stepState}`}>
                          <span className="timeline-dot" />
                          <span className="timeline-label">{step}</span>
                        </div>
                      )
                    })}
                  </div>

                  {String(order.tracking_status || '').trim().toLowerCase() === 'cancelled' ? (
                    <p className="checkout-message error" style={{ marginTop: '8px' }}>
                      Cancelled: {order.cancellation_reason || 'Cancelled by customer'}
                    </p>
                  ) : null}

                  <div className="tracking-order-grid">
                    <div>
                      <p>
                        <strong>Customer:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="customerName"
                            value={draft.customerName}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.customer_name
                        )}
                      </p>
                      <p>
                        <strong>Email:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            type="email"
                            name="customerEmail"
                            value={draft.customerEmail}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.customer_email
                        )}
                      </p>
                      <p>
                        <strong>Phone:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="phone"
                            value={draft.phone}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.phone
                        )}
                      </p>
                      <p>
                        <strong>Alternate:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="alternatePhone"
                            value={draft.alternatePhone}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.alternate_phone || '-'
                        )}
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>Address:</strong>{' '}
                        {isEditing ? (
                          <textarea
                            className="tracking-input"
                            name="address"
                            rows={2}
                            value={draft.address}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.address
                        )}
                      </p>
                      <p>
                        <strong>Nearby:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="nearbyLocation"
                            value={draft.nearbyLocation}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.nearby_location || '-'
                        )}
                      </p>
                      <p>
                        <strong>City / District / State:</strong>{' '}
                        {isEditing ? (
                          <span className="tracking-inline-group">
                            <input
                              className="tracking-input"
                              name="city"
                              value={draft.city}
                              onChange={handleDraftChange}
                            />
                            <input
                              className="tracking-input"
                              name="district"
                              value={draft.district}
                              onChange={handleDraftChange}
                            />
                            <input
                              className="tracking-input"
                              name="state"
                              value={draft.state}
                              onChange={handleDraftChange}
                            />
                          </span>
                        ) : (
                          `${order.city}, ${order.district}, ${order.state}`
                        )}
                      </p>
                      <p>
                        <strong>Pincode:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="pincode"
                            value={draft.pincode}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.pincode
                        )}
                      </p>
                    </div>

                    <div>
                      <p>
                        <strong>Status:</strong>{' '}
                        {isEditing ? (
                          <select
                            className="tracking-input"
                            name="trackingStatus"
                            value={draft.trackingStatus}
                            onChange={handleDraftChange}
                          >
                            {TRACKING_STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          order.tracking_status
                        )}
                      </p>
                      <p>
                        <strong>Courier:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="courierName"
                            value={draft.courierName}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.courier_name || '-'
                        )}
                      </p>
                      <p>
                        <strong>Tracking Number:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="trackingNumber"
                            value={draft.trackingNumber}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.tracking_number || '-'
                        )}
                      </p>
                      <p>
                        <strong>Current Location:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            name="currentLocation"
                            value={draft.currentLocation}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.current_location || '-'
                        )}
                      </p>
                      <p>
                        <strong>Estimated Delivery:</strong>{' '}
                        {isEditing ? (
                          <input
                            className="tracking-input"
                            type="date"
                            name="estimatedDelivery"
                            value={draft.estimatedDelivery}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.estimated_delivery || '-'
                        )}
                      </p>
                      <p>
                        <strong>Delivery Notes:</strong>{' '}
                        {isEditing ? (
                          <textarea
                            className="tracking-input"
                            name="deliveryNotes"
                            rows={2}
                            value={draft.deliveryNotes}
                            onChange={handleDraftChange}
                          />
                        ) : (
                          order.delivery_notes || '-'
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <strong>Items:</strong>
                    <ul className="checkout-items">
                      {(order.items || []).map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <span>
                            {item.product_name} x{item.quantity}
                          </span>
                          <span>Rs{item.line_total}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isAdmin ? (
                    <details className="tracking-details-panel">
                      <summary>View Full Submitted Details</summary>
                      <div className="tracking-details-body">
                        <h4>Customer Details</h4>
                        <button
                          type="button"
                          className="tracking-copy-button"
                          onClick={() => copyText(order.customer_details_text)}
                        >
                          Copy Customer Details
                        </button>
                        <pre>{order.customer_details_text || '-'}</pre>

                        <h4>Order Details</h4>
                        <button
                          type="button"
                          className="tracking-copy-button"
                          onClick={() => copyText(order.order_details_text)}
                        >
                          Copy Order Details
                        </button>
                        <pre>{order.order_details_text || '-'}</pre>

                        <h4>Full Submission</h4>
                        <button
                          type="button"
                          className="tracking-copy-button"
                          onClick={() => copyText(order.full_details_text)}
                        >
                          Copy Full Submission
                        </button>
                        <pre>{order.full_details_text || '-'}</pre>
                      </div>
                    </details>
                  ) : null}

                  {isAdmin ? (
                    <div className="admin-actions">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className="auth-submit"
                            disabled={saving}
                            onClick={() => saveOrder(order.id)}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button type="button" className="link-button" onClick={cancelEditing}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" className="auth-submit" onClick={() => startEditing(order)}>
                          Edit Delivery Details
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="admin-actions">
                      {['order placed', 'packed'].includes(
                        String(order.tracking_status || '').trim().toLowerCase(),
                      ) ? (
                        <button
                          type="button"
                          className="link-button"
                          disabled={cancelingOrderId === order.id}
                          onClick={() => cancelOrder(order)}
                        >
                          {cancelingOrderId === order.id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      ) : (
                        <p className="tracking-order-meta">Cancellation not available for this status.</p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
