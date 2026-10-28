import { variantLabel } from '../core/i18n/content'
import { useText } from '../core/i18n/useText'
import { Link } from '../components/StoreRouterLink'
import { ArrowLeft, ArrowRight, Minus, Plus, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { EmptyState, Money } from '../components/Shared'

export function OrderSummary({ checkout = false }: { checkout?: boolean }) {
  const t = useText()

  const { totals, config, provider } = useStore()
  return (
    <aside className="order-summary">
      <span className="eyebrow">{t('THE DETAILS')}</span>
      <h2>{t('Order summary')}</h2>
      <dl>
        <div>
          <dt>{t('Subtotal')}</dt>
          <dd>
            <Money amount={totals.subtotal} />
          </dd>
        </div>
        <div>
          <dt>{t('Delivery')}</dt>
          <dd>{totals.shipping === 0 ? t('Complimentary') : <Money amount={totals.shipping} />}</dd>
        </div>
        <div className="summary-total">
          <dt>{t('Total')}</dt>
          <dd>
            <Money amount={totals.total} />
          </dd>
        </div>
      </dl>
      <p>{config.checkout.notice}</p>
      {!checkout && (
        <Link to="/checkout" className="button primary">
          {t('Continue to checkout')}
          <ArrowRight size={18} />
        </Link>
      )}
      <div className="summary-note">
        {provider.mode === 'mock'
          ? t('Demo checkout · No payment required')
          : t('Final availability and totals are confirmed when your order is received.')}
      </div>
    </aside>
  )
}
export default function Cart() {
  const t = useText()

  const { cart, products, count, updateQuantity, config, totals } = useStore()
  if (!cart.length)
    return (
      <EmptyState
        title={t('Room for something good.')}
        text="Your bag is empty. Let’s find your next everyday favorite."
      />
    )
  const remaining = Math.max(0, (config.checkout.freeShippingThreshold ?? 0) - totals.subtotal)
  return (
    <div className="page-width cart-page">
      <div className="page-intro">
        <span className="eyebrow">{t('GOOD CHOICES')}</span>
        <h1>
          {t('Your bag')}
          <span className="heading-count">{count}</span>
        </h1>
      </div>
      <div className="checkout-layout">
        <div>
          {config.checkout.freeShippingThreshold !== undefined && (
            <div className="shipping-progress">
              <p>
                {remaining ? (
                  <>
                    <Money amount={remaining} />
                    {t('away from complimentary delivery.')}
                  </>
                ) : (
                  t('A little extra, on us. Your delivery is complimentary.')
                )}
              </p>
              <progress
                value={Math.min(totals.subtotal, config.checkout.freeShippingThreshold)}
                max={config.checkout.freeShippingThreshold || 1}
                aria-label={t('Progress toward complimentary delivery')}
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
                    <p>{variantLabel(variant, config.locale)}</p>
                    <div className="quantity-control">
                      <button
                        aria-label={t('Decrease {value0} quantity', { value0: product.name })}
                        onClick={() => updateQuantity(product.id, variant.id, line.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <output>{line.quantity}</output>
                      <button
                        aria-label={t('Increase {value0} quantity', { value0: product.name })}
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
                      aria-label={t('Remove {value0}', { value0: product.name })}
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
            {t('Keep exploring')}
          </Link>
        </div>
        <OrderSummary />
      </div>
    </div>
  )
}
