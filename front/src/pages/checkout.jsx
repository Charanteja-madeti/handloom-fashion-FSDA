import { useEffect, useState } from 'react'
import emailjs from '@emailjs/browser'
import { getAccessToken, getCurrentUser } from './auth'

const RECEIVER_EMAIL = 'madeticharanteja19@gmail.com'
const UPI_PREFERRED_APP_STORAGE_KEY = 'preferred_upi_app'
const UPI_MERCHANT_ID = (import.meta.env.VITE_UPI_MERCHANT_ID || '').trim()
const UPI_MERCHANT_NAME = (import.meta.env.VITE_UPI_MERCHANT_NAME || 'Handloom Fashion').trim()
const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'bhim', label: 'BHIM / Other UPI' },
]

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  alternatePhone: '',
  address: '',
  nearbyLocation: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
}

const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
const API_ROOT = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '').replace(/\/api$/, '')
  : configuredApiBaseUrl

function apiUrl(path) {
  return `${API_ROOT}${path}`
}

export default function CheckoutPage({ cartItems = [], onOrderPlaced }) {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSending, setIsSending] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentReference, setPaymentReference] = useState('')
  const [upiId, setUpiId] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [selectedUpiApp, setSelectedUpiApp] = useState(() => localStorage.getItem(UPI_PREFERRED_APP_STORAGE_KEY) || 'gpay')
  const [upiAppOpened, setUpiAppOpened] = useState(false)
  const [onlinePaymentConfirmed, setOnlinePaymentConfirmed] = useState(false)
  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const shipping = subtotal > 0 && subtotal < 999 ? 49 : 0
  const totalAmount = subtotal + shipping
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  useEffect(() => {
    const currentUser = getCurrentUser()
    const email = String(currentUser?.email || '').trim()
    if (!email) {
      return
    }

    setForm((previous) => ({
      ...previous,
      email,
    }))
  }, [])

  useEffect(() => {
    localStorage.setItem(UPI_PREFERRED_APP_STORAGE_KEY, selectedUpiApp)
  }, [selectedUpiApp])

  useEffect(() => {
    setOnlinePaymentConfirmed(false)
    setUpiAppOpened(false)
  }, [paymentMethod])

  const cartLines =
    cartItems.length > 0
      ? cartItems
          .map((item) => `${item.name} x${item.quantity} - Rs${item.price * item.quantity}`)
          .join('\n')
      : 'No items in cart'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  function openUpiApp(orderIdForPayment) {
    if (!UPI_MERCHANT_ID) {
      setStatus({
        type: 'error',
        text: 'UPI merchant ID is missing. Add VITE_UPI_MERCHANT_ID in frontend environment.',
      })
      return
    }

    const amount = Number(totalAmount || 0).toFixed(2)
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_MERCHANT_ID)}&pn=${encodeURIComponent(UPI_MERCHANT_NAME)}&tr=${encodeURIComponent(orderIdForPayment)}&tn=${encodeURIComponent(`Order ${orderIdForPayment}`)}&am=${encodeURIComponent(amount)}&cu=INR`

    window.location.href = upiUrl
    setUpiAppOpened(true)
    setStatus({
      type: 'success',
      text: `Opened ${UPI_APPS.find((app) => app.id === selectedUpiApp)?.label || 'UPI app'}. Complete payment and enter UTR/reference to confirm order.`,
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (cartItems.length === 0) {
      setStatus({ type: 'error', text: 'Your cart is empty. Add products before checkout.' })
      return
    }

    const currentUser = getCurrentUser()
    const normalizedLoginEmail = String(currentUser?.email || '').trim().toLowerCase()
    const normalizedFormEmail = String(form.email || '').trim().toLowerCase()

    if (!normalizedLoginEmail) {
      setStatus({ type: 'error', text: 'Session expired. Please login again.' })
      return
    }

    if (normalizedFormEmail !== normalizedLoginEmail) {
      setStatus({
        type: 'error',
        text: `Please use your login email (${normalizedLoginEmail}) for this order.`,
      })
      return
    }

    const token = getAccessToken()
    if (!token) {
      setStatus({ type: 'error', text: 'Session expired. Please login again.' })
      return
    }

    if (!paymentMethod) {
      setStatus({ type: 'error', text: 'Please choose a payment method to confirm order.' })
      return
    }

    if (paymentMethod === 'UPI' && !isMobileDevice && !upiId.trim()) {
      setStatus({ type: 'error', text: 'Please enter your UPI ID.' })
      return
    }

    if (paymentMethod === 'CARD' && !/^\d{4}$/.test(cardLast4.trim())) {
      setStatus({ type: 'error', text: 'Please enter last 4 digits of your card.' })
      return
    }

    const normalizedPaymentReference = String(paymentReference || '').trim()
    if (paymentMethod !== 'COD' && !normalizedPaymentReference) {
      setStatus({ type: 'error', text: 'Please enter payment transaction/reference ID.' })
      return
    }

    if (paymentMethod === 'UPI' && isMobileDevice && !upiAppOpened) {
      setStatus({ type: 'error', text: 'Please tap Open UPI App before confirming order.' })
      return
    }

    if (paymentMethod !== 'COD' && !onlinePaymentConfirmed) {
      setStatus({ type: 'error', text: 'Please confirm that you completed online payment.' })
      return
    }

    const normalizedPaymentStatus = paymentMethod === 'COD' ? 'Pending' : 'Paid'

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim()
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim()
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim()
    const canSendEmail = Boolean(serviceId && templateId && publicKey)

    const orderId = `HF-${Date.now()}`
    const orders = cartItems.map((item) => ({
      name: item.name,
      price: item.price,
      units: item.quantity,
    }))
    const firstOrder = orders[0] ?? { name: 'No Item', price: 0, units: 0 }
    const customerDetails = [
      `Order ID: ${orderId}`,
      `First Name: ${form.firstName}`,
      `Last Name: ${form.lastName}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone}`,
      `Alternate Phone: ${form.alternatePhone}`,
      `Address: ${form.address}`,
      `Nearby Location: ${form.nearbyLocation}`,
      `City: ${form.city}`,
      `District: ${form.district}`,
      `State: ${form.state}`,
      `Pincode: ${form.pincode}`,
      `Payment Method: ${paymentMethod}`,
      `Payment Status: ${normalizedPaymentStatus}`,
      paymentMethod === 'UPI' ? `UPI ID: ${upiId}` : null,
      paymentMethod === 'UPI' ? `UPI App: ${selectedUpiApp}` : null,
      paymentMethod === 'CARD' ? `Card Last 4 Digits: ${cardLast4}` : null,
      normalizedPaymentReference ? `Payment Reference: ${normalizedPaymentReference}` : null,
      `Submitted At: ${new Date().toLocaleString()}`,
    ]
      .filter(Boolean)
      .join('\n')
    const orderDetails =
      cartItems.length > 0
        ? cartItems
            .map(
              (item, index) =>
                `${index + 1}. ${item.name} | Qty: ${item.quantity} | Price: Rs${item.price} | Line Total: Rs${item.price * item.quantity}`,
            )
            .join('\n')
        : 'No items in cart'
    const fullDetails =
      `${customerDetails}\n\nOrder Items:\n${orderDetails}\n\n` +
      `Item Count: ${itemCount}\nSubtotal: Rs${subtotal}\nShipping: Rs${shipping}\nTotal: Rs${totalAmount}`
    const submittedAtIso = new Date().toISOString()

    try {
      setIsSending(true)
      setStatus({ type: '', text: '' })

      if (canSendEmail) {
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: RECEIVER_EMAIL,
            email: RECEIVER_EMAIL,
            recipient_email: RECEIVER_EMAIL,
            email_to: RECEIVER_EMAIL,
            to: RECEIVER_EMAIL,
            user_email: RECEIVER_EMAIL,
            user_mail: RECEIVER_EMAIL,
            send_to: RECEIVER_EMAIL,
            mail_to: RECEIVER_EMAIL,
            destination_email: RECEIVER_EMAIL,
            order_id: orderId,
            orders,
            name: firstOrder.name,
            price: firstOrder.price,
            units: firstOrder.units,
            customer_details: customerDetails,
            order_details: orderDetails,
            full_details: fullDetails,
            message: fullDetails,
            customer_name: `${form.firstName} ${form.lastName}`.trim(),
            full_name: `${form.firstName} ${form.lastName}`.trim(),
            first_name: form.firstName,
            last_name: form.lastName,
            customer_first_name: form.firstName,
            customer_last_name: form.lastName,
            customer_email: form.email,
            email_address: form.email,
            customer_phone: form.phone,
            phone: form.phone,
            customer_alternate_phone: form.alternatePhone,
            alternate_phone: form.alternatePhone,
            customer_address: form.address,
            address: form.address,
            delivery_address: form.address,
            customer_nearby_location: form.nearbyLocation,
            nearby_location: form.nearbyLocation,
            customer_city: form.city,
            city: form.city,
            customer_district: form.district,
            district: form.district,
            customer_state: form.state,
            state: form.state,
            customer_pincode: form.pincode,
            pincode: form.pincode,
            delivery_to: `${form.firstName} ${form.lastName}, ${form.address}, ${form.nearbyLocation}, ${form.city}, ${form.district}, ${form.state} - ${form.pincode}. Phone: ${form.phone}`,
            cart_items: cartLines,
            item_count: itemCount,
            subtotal_amount: subtotal,
            shipping_amount: shipping,
            total_amount: totalAmount,
            submitted_at: new Date().toLocaleString(),
            payment_method: paymentMethod,
            payment_status: normalizedPaymentStatus,
            payment_reference: normalizedPaymentReference,
            payment_app: paymentMethod === 'UPI' ? selectedUpiApp : '',
            payer_upi_id: paymentMethod === 'UPI' ? upiId : '',
          },
          { publicKey },
        )
      }

      const orderResponse = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          customerEmail: normalizedFormEmail,
          phone: form.phone,
          alternatePhone: form.alternatePhone,
          address: form.address,
          nearbyLocation: form.nearbyLocation,
          city: form.city,
          district: form.district,
          state: form.state,
          pincode: form.pincode,
          itemCount,
          subtotal,
          shipping,
          totalAmount,
          paymentMethod,
          paymentStatus: normalizedPaymentStatus,
          paymentReference: normalizedPaymentReference,
          paymentApp: paymentMethod === 'UPI' ? selectedUpiApp : null,
          payerUpiId: paymentMethod === 'UPI' ? upiId.trim() || null : null,
          submittedAt: submittedAtIso,
          customerDetails,
          orderDetails,
          fullDetails,
          items: cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      })

      const orderData = await orderResponse.json().catch(() => ({}))
      if (!orderResponse.ok) {
        throw new Error(
          orderData?.message ||
            `Unable to save order tracking details (HTTP ${orderResponse.status}).`,
        )
      }

      setStatus({
        type: 'success',
        text: canSendEmail
          ? 'Order placed and tracking details saved successfully.'
          : 'Order placed and tracking details saved successfully (email notification is disabled).',
      })
      setForm(initialForm)
      onOrderPlaced?.()
    } catch (error) {
      const reason =
        error?.text || error?.message || 'Unknown EmailJS error. Check service/template/public key.'
      console.error('Checkout failed:', error)
      setStatus({
        type: 'error',
        text: `Failed to place order: ${reason}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="container section">
      <h2>Checkout</h2>
      <div className="checkout-layout">
        {status.type === 'success' ? (
          <div className="checkout-success" role="status" aria-live="polite">
            <div className="checkout-success-icon" aria-hidden="true">
              ✓
            </div>
            <h3>Order Placed</h3>
            <p>{status.text}</p>
          </div>
        ) : (
          <form className="checkout-form" onSubmit={handleSubmit}>
            <label>
              First Name
              <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required />
            </label>
            <label>
              Last Name
              <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>
            <label>
              Email Address
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              Phone Number
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
            </label>
            <label>
              Alternate Phone Number
              <input type="tel" name="alternatePhone" value={form.alternatePhone} onChange={handleChange} required />
            </label>
            <label>
              Address
              <input type="text" name="address" value={form.address} onChange={handleChange} required />
            </label>
            <label>
              Nearby Location
              <input type="text" name="nearbyLocation" value={form.nearbyLocation} onChange={handleChange} required />
            </label>
            <label>
              City
              <input type="text" name="city" value={form.city} onChange={handleChange} required />
            </label>
            <label>
              District
              <input type="text" name="district" value={form.district} onChange={handleChange} required />
            </label>
            <label>
              State
              <input type="text" name="state" value={form.state} onChange={handleChange} required />
            </label>
            <label>
              Pincode
              <input type="text" name="pincode" value={form.pincode} onChange={handleChange} required />
            </label>
            <label>
              Payment Method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} required>
                <option value="">Select Payment Method</option>
                <option value="COD">Cash on Delivery</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card (Mock Payment)</option>
              </select>
            </label>
            {paymentMethod === 'UPI' ? (
              <>
                <label>
                  Preferred UPI App
                  <select
                    value={selectedUpiApp}
                    onChange={(event) => setSelectedUpiApp(event.target.value)}
                    required
                  >
                    {UPI_APPS.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.label}
                      </option>
                    ))}
                  </select>
                </label>

                {isMobileDevice ? (
                  <button
                    type="button"
                    onClick={() => openUpiApp(`HF-${Date.now()}`)}
                    style={{ marginBottom: '8px' }}
                  >
                    Open UPI App
                  </button>
                ) : (
                  <label>
                    UPI ID (Desktop / PC)
                    <input
                      type="text"
                      value={upiId}
                      onChange={(event) => setUpiId(event.target.value)}
                      placeholder="example@upi"
                      required
                    />
                  </label>
                )}
              </>
            ) : null}
            {paymentMethod === 'CARD' ? (
              <label>
                Card Last 4 Digits
                <input
                  type="text"
                  value={cardLast4}
                  onChange={(event) => setCardLast4(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  required
                />
              </label>
            ) : null}
            {paymentMethod !== 'COD' ? (
              <>
                <label>
                  Payment Transaction/Reference ID
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="UPI UTR / Card txn reference"
                    required
                  />
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={onlinePaymentConfirmed}
                    onChange={(event) => setOnlinePaymentConfirmed(event.target.checked)}
                  />
                  I completed online payment and received app notification on my phone.
                </label>
              </>
            ) : null}
            <button type="submit" disabled={isSending}>
              {isSending
                ? paymentMethod === 'COD'
                  ? 'Placing Order...'
                  : 'Processing Payment...'
                : paymentMethod === 'COD'
                  ? 'Place Order'
                  : 'Pay & Place Order'}
            </button>
            {status.text && <p className={`checkout-message ${status.type}`}>{status.text}</p>}
          </form>
        )}

        <aside className="checkout-summary">
          <h3>Order Summary</h3>
          {cartItems.length > 0 ? (
            <ul className="checkout-items">
              {cartItems.map((item) => (
                <li key={item.id}>
                  <span>{item.name}</span>
                  <span>x{item.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="checkout-note">No items in cart.</p>
          )}
          <p>Items: {itemCount}</p>
          <p>Subtotal: Rs{subtotal}</p>
          <p>Shipping: Rs{shipping}</p>
          <p className="checkout-total">Total: Rs{totalAmount}</p>
          <p>Payment: {paymentMethod || '-'}</p>
          <p>Delivery: 3-5 business days</p>
          <p className="checkout-note">Payment modes: COD, UPI, and Card (mock).</p>
        </aside>
      </div>
    </section>
  )
}
