import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Minus, Plus, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { EmptyState, Money } from '../components/Shared'

export function OrderSummary({ checkout = false }: { checkout?: boolean }) {
  const { totals, config, provider } = useStore()
  return (
    <aside className="order-summary">
      <span className="eyebrow">THE DETAILS</span>
      <h2>Order summary</h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>
            <Money amount={totals.subtotal} />
          </dd>
        </div>
        <div>
          <dt>Delivery</dt>
          <dd>{totals.shipping === 0 ? 'Complimentary' : <Money amount={totals.shipping} />}</dd>
        </div>
        <div className="summary-total">
          <dt>Total</dt>
          <dd>
            <Money amount={totals.total} />
          </dd>
        </div>
      </dl>
      <p>{config.checkout.notice}</p>
      {!checkout && (
        <Link to="/checkout" className="button primary">
          Continue to checkout
          <ArrowRight size={18} />
        </Link>
      )}
      <div className="summary-note">
        {provider.mode === 'mock'
          ? 'Demo checkout · No payment required'
          : 'Final availability and totals are confirmed when your order is received.'}
      </div>
    </aside>
  )
}
export default function Cart() {
  const { cart, products, count, updateQuantity, config, totals } = useStore()
  if (!cart.length)
    return (
      <EmptyState
        title="Room for something good."
        text="Your bag is empty. Let’s find your next everyday favorite."
      />
    )
  const remaining = Math.max(0, (config.checkout.freeShippingThreshold ?? 0) - totals.subtotal)
  return (
    <div className="page-width cart-page">
      <div className="page-intro">
        <span className="eyebrow">GOOD CHOICES</span>
        <h1>
          Your bag<span className="heading-count">{count}</span>
        </h1>
      </div>
      <div className="checkout-layout">
        <div>
          {config.checkout.freeShippingThreshold !== undefined && (
            <div className="shipping-progress">
              <p>
                {remaining ? (
                  <>
                    <Money amount={remaining} /> away from complimentary delivery.
                  </>
                ) : (
                  'A little extra, on us. Your delivery is complimentary.'
                )}
              </p>
              <progress
                value={Math.min(totals.subtotal, config.checkout.freeShippingThreshold)}
                max={config.checkout.freeShippingThreshold || 1}
                aria-label="Progress toward complimentary delivery"
              />
            </div>
          )}
          <div className="cart-lines">
            {cart.map((line) => {
              const product = products.find((p) => p.id === line.productId)!
              const variant = product.variants.find((v) => v.id === line.variantId)!
              return (
                <article className="cart-line" key={`${line.productId}:${line.variantId}`}>
                  <Link to={`/products/${product.slug}`}>
                    <img
                      src={variant.image || product.images[0]}
                      alt={product.name}
                      width="120"
                      height="120"
                    />
                  </Link>
                  <div className="cart-line-copy">
                    <span className="eyebrow">{product.brand}</span>
                    <Link className="product-name" to={`/products/${product.slug}`}>
                      {product.name}
                    </Link>
                    <p>{Object.values(variant.options).join(' / ')}</p>
                    <div className="quantity-control">
                      <button
                        aria-label={`Decrease ${product.name} quantity`}
                        onClick={() => updateQuantity(product.id, variant.id, line.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <output>{line.quantity}</output>
                      <button
                        aria-label={`Increase ${product.name} quantity`}
                        disabled={line.quantity >= variant.stock}
                        onClick={() => updateQuantity(product.id, variant.id, line.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-line-end">
                    <button
                      className="icon-button"
                      aria-label={`Remove ${product.name}`}
                      onClick={() => updateQuantity(product.id, variant.id, 0)}
                    >
                      <X size={18} />
                    </button>
                    <strong>
                      <Money amount={variant.price * line.quantity} />
                    </strong>
                  </div>
                </article>
              )
            })}
          </div>
          <Link className="back-link" to="/catalog">
            <ArrowLeft size={16} />
            Keep exploring
          </Link>
        </div>
        <OrderSummary />
      </div>
    </div>
  )
}
