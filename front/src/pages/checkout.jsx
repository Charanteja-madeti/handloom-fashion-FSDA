import { useState } from 'react'
import emailjs from '@emailjs/browser'

const RECEIVER_EMAIL = 'madeticharanteja19@gmail.com'

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

export default function CheckoutPage({ cartItems = [] }) {
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSending, setIsSending] = useState(false)

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const shipping = subtotal > 0 && subtotal < 999 ? 49 : 0
  const totalAmount = subtotal + shipping
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  const cartLines =
    cartItems.length > 0
      ? cartItems
          .map((item) => `${item.name} x${item.quantity} - ₹${item.price * item.quantity}`)
          .join('\n')
      : 'No items in cart'

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID?.trim()
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID?.trim()
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY?.trim()

    if (!serviceId || !templateId || !publicKey) {
      setStatus({
        type: 'error',
        text: 'Email service is not configured. Please add EmailJS keys in .env.local.',
      })
      return
    }

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
      `Submitted At: ${new Date().toLocaleString()}`,
    ].join('\n')
    const orderDetails =
      cartItems.length > 0
        ? cartItems
            .map(
              (item, index) =>
                `${index + 1}. ${item.name} | Qty: ${item.quantity} | Price: ₹${item.price} | Line Total: ₹${item.price * item.quantity}`,
            )
            .join('\n')
        : 'No items in cart'
    const fullDetails =
      `${customerDetails}\n\nOrder Items:\n${orderDetails}\n\n` +
      `Item Count: ${itemCount}\nSubtotal: ₹${subtotal}\nShipping: ₹${shipping}\nTotal: ₹${totalAmount}`

    try {
      setIsSending(true)
      setStatus({ type: '', text: '' })

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
        },
        { publicKey },
      )

      setStatus({
        type: 'success',
        text: 'Order details sent successfully to your Gmail.',
      })
      setForm(initialForm)
    } catch (error) {
      const reason =
        error?.text || error?.message || 'Unknown EmailJS error. Check service/template/public key.'
      console.error('EmailJS send failed:', error)
      setStatus({
        type: 'error',
        text: `Failed to send details: ${reason}`,
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
              <input
                type="text"
                name="firstName"
                placeholder="Enter your first name"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Last Name
              <input
                type="text"
                name="lastName"
                placeholder="Enter your last name"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Email Address
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Phone Number
              <input
                type="tel"
                name="phone"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Alternate Phone Number
              <input
                type="tel"
                name="alternatePhone"
                placeholder="Enter alternate phone number"
                value={form.alternatePhone}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Address
              <input
                type="text"
                name="address"
                placeholder="Enter delivery address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Nearby Location
              <input
                type="text"
                name="nearbyLocation"
                placeholder="Landmark / nearby location"
                value={form.nearbyLocation}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              City
              <input
                type="text"
                name="city"
                placeholder="Enter your city"
                value={form.city}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              District
              <input
                type="text"
                name="district"
                placeholder="Enter your district"
                value={form.district}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              State
              <input
                type="text"
                name="state"
                placeholder="Enter your state"
                value={form.state}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Pincode
              <input
                type="text"
                name="pincode"
                placeholder="Enter your pincode"
                value={form.pincode}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" disabled={isSending}>
              {isSending ? 'Sending...' : 'Place Order'}
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
          <p>Subtotal: ₹{subtotal}</p>
          <p>Shipping: ₹{shipping}</p>
          <p className="checkout-total">Total: ₹{totalAmount}</p>
          <p>Delivery: 3-5 business days</p>
          <p className="checkout-note">Cash on Delivery and UPI options available.</p>
        </aside>
      </div>
    </section>
  )
}
