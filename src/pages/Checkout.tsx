import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { EmptyState } from '../components/Shared'
import { OrderSummary } from './Cart'
import { Dropdown } from '../components/Dropdown'
import type { Customer, OrderResult } from '../core/schema'

export default function Checkout() {
  const { cart, config, provider, clearCart } = useStore()
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Customer, string>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<OrderResult | null>(null)
  const submitting = useRef(false)
  const request = useRef<AbortController | null>(null)
  const attempt = useRef({ fingerprint: '', key: '' })
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (result) document.getElementById('confirmation-heading')?.focus()
  }, [result])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting.current) return
    const clean = Object.fromEntries(
      Object.entries(customer).map(([key, value]) => [key, value.trim()]),
    ) as unknown as Customer
    const next: Partial<Record<keyof Customer, string>> = {}
    for (const key of Object.keys(clean) as (keyof Customer)[])
      if (!clean[key]) next[key] = 'Please complete this field.'
    if (clean.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))
      next.email = 'Enter a valid email address.'
    if (clean.phone && !/^[+\d\s().-]{7,25}$/.test(clean.phone))
      next.phone = 'Enter a valid phone number.'
    if (!config.checkout.countries.includes(clean.country))
      next.country = 'Choose a delivery destination.'
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(`customer-${Object.keys(next)[0]}`)?.focus()
      return
    }
    submitting.current = true
    setBusy(true)
    setError('')
    const fingerprint = JSON.stringify({ customer: clean, cart })
    if (attempt.current.fingerprint !== fingerprint)
      attempt.current = { fingerprint, key: crypto.randomUUID() }
    request.current = new AbortController()
    try {
      const order = await provider.placeOrder(
        {
          storeId: config.storeId,
          customer: clean,
          items: cart,
          idempotencyKey: attempt.current.key,
        },
        request.current.signal,
      )
      setResult(order)
      clearCart()
    } catch (e) {
      if (!request.current.signal.aborted)
        setError(e instanceof Error ? e.message : 'We couldn’t send your order. Please try again.')
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }
  if (result)
    return (
      <div className="confirmation page-width">
        <div className="confirmation-icon">
          <Check size={32} />
        </div>
        <span className="eyebrow">
          {result.status === 'demo' ? 'DEMO COMPLETE' : 'ORDER RECEIVED'}
        </span>
        <h1 id="confirmation-heading" tabIndex={-1}>
          {result.status === 'demo'
            ? 'A good choice, beautifully made.'
            : 'Thank you for your order.'}
        </h1>
        <p>{result.message}</p>
        <div className="order-reference">
          Reference: <strong>{result.id}</strong>
        </div>
        <Link to="/catalog" className="button primary">
          Keep exploring
          <ArrowRight size={18} />
        </Link>
      </div>
    )
  if (!cart.length)
    return (
      <EmptyState
        title="Your next favorite is waiting."
        text="Add something to your bag before checking out."
      />
    )
  const fields: {
    key: Exclude<keyof Customer, 'country'>
    label: string
    autocomplete: string
    type?: string
  }[] = [
    { key: 'name', label: 'Full name', autocomplete: 'name' },
    { key: 'email', label: 'Email address', autocomplete: 'email', type: 'email' },
    { key: 'phone', label: 'Phone number', autocomplete: 'tel', type: 'tel' },
    { key: 'address', label: 'Street address', autocomplete: 'street-address' },
    { key: 'city', label: 'City', autocomplete: 'address-level2' },
  ]
  return (
    <div className="page-width checkout-page">
      <Link className="back-link" to="/cart">
        <ArrowLeft size={16} />
        Back to your bag
      </Link>
      <div className="page-intro">
        <span className="eyebrow">ALMOST YOURS</span>
        <h1>A few final details.</h1>
        <p>
          {provider.mode === 'mock'
            ? 'Explore the checkout experience. No real purchase will be made.'
            : 'Tell us where your order should go.'}
        </p>
      </div>
      <div className="checkout-layout">
        <form onSubmit={submit} noValidate className="checkout-form">
          <h2>Contact & delivery</h2>
          <fieldset disabled={busy}>
            <legend className="sr-only">Customer information</legend>
            <div className="form-grid">
              {fields.map((field) => (
                <div className={field.key === 'address' ? 'full-width' : ''} key={field.key}>
                  <label htmlFor={`customer-${field.key}`}>{field.label}</label>
                  <input
                    id={`customer-${field.key}`}
                    name={field.key}
                    autoComplete={field.autocomplete}
                    type={field.type || 'text'}
                    maxLength={field.key === 'address' ? 300 : 150}
                    required
                    value={customer[field.key]}
                    aria-invalid={!!errors[field.key]}
                    aria-describedby={errors[field.key] ? `error-${field.key}` : undefined}
                    onChange={(e) =>
                      setCustomer((previous) => ({ ...previous, [field.key]: e.target.value }))
                    }
                  />
                  {errors[field.key] && (
                    <span className="field-error" id={`error-${field.key}`}>
                      {errors[field.key]}
                    </span>
                  )}
                </div>
              ))}
              <div>
                <label htmlFor="customer-country">Country / region</label>
                <Dropdown
                  id="customer-country"
                  name="country"
                  required
                  disabled={busy}
                  value={customer.country}
                  invalid={!!errors.country}
                  describedBy={errors.country ? 'error-country' : undefined}
                  onValueChange={(value) =>
                    setCustomer((previous) => ({ ...previous, country: value }))
                  }
                  placeholder="Select destination"
                  options={config.checkout.countries.map((value) => ({ value, label: value }))}
                />
                {errors.country && (
                  <span className="field-error" id="error-country">
                    {errors.country}
                  </span>
                )}
              </div>
            </div>
          </fieldset>
          <div className="checkout-notice">
            <ShieldCheck size={22} />
            <div>
              <strong>
                {provider.mode === 'mock'
                  ? 'A demonstration, from start to finish.'
                  : 'Order request'}
              </strong>
              <p>
                {provider.mode === 'mock'
                  ? 'Use sample contact details. They stay in this browser session and are not sent to a server.'
                  : 'Your order is sent to the store for confirmation. Payment is handled separately by the store.'}
              </p>
            </div>
          </div>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary checkout-submit" disabled={busy} type="submit">
            {busy
              ? 'Submitting…'
              : provider.mode === 'mock'
                ? 'Complete demo order'
                : 'Submit order request'}
            <ArrowRight size={18} />
          </button>
        </form>
        <OrderSummary checkout />
      </div>
    </div>
  )
}
