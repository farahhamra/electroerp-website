import { variantLabel } from '../core/i18n/content'
import { useText } from '../core/i18n/useText'
import ConfiguredProduct from './ConfiguredProduct'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from '../components/StoreRouterLink'
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Truck } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { EmptyState, Money, ProductCard } from '../components/Shared'
import type { Product as ProductType } from '../core/schema'

function ProductView({ product }: { product: ProductType }) {
  const t = useText()

  const { products, addToCart, cart, config } = useStore()
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.stock > 0)?.id ?? product.variants[0].id,
  )
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState(product.images[0])
  const variant = product.variants.find((v) => v.id === variantId)!
  const inBag =
    cart.find((line) => line.productId === product.id && line.variantId === variantId)?.quantity ??
    0
  const available = Math.max(0, variant.stock - inBag)
  const related = products
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4)
  return (
    <div className="page-width product-page">
      <Link className="back-link" to="/catalog">
        <ArrowLeft size={16} />
        {t('Back to the collection')}
      </Link>
      <div className="product-detail">
        <div className="product-gallery">
          <img
            className="detail-image"
            src={image}
            alt={`${product.name}, ${Object.values(variant.options).join(', ')}`}
            width="600"
            height="520"
          />
          {product.images.length > 1 && (
            <div className="thumbnails">
              {product.images.map((src, index) => (
                <button
                  key={src}
                  onClick={() => setImage(src)}
                  aria-label={t('View image {value0}', { value0: index + 1 })}
                  aria-pressed={image === src}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {product.brand} / {product.categoryName}
          </span>
          <h1>{product.name}</h1>
          <div className="detail-price">
            <Money amount={variant.price} />
            {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
              <del>
                <Money amount={variant.compareAtPrice} />
              </del>
            )}
          </div>
          <p className="detail-description">{product.description}</p>
          <fieldset className="variant-options">
            <legend>{t('Choose your option')}</legend>
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={variantId === v.id}
                className={variantId === v.id ? 'selected' : ''}
                onClick={() => {
                  setVariantId(v.id)
                  setQuantity(1)
                  setImage(v.image || product.images[0])
                }}
              >
                {variantLabel(v, config.locale) || 'Standard'}
                {v.stock === 0 ? ' · Sold out' : ''}
              </button>
            ))}
          </fieldset>
          <p className={`availability ${variant.stock ? '' : 'sold-out'}`}>
            {variant.stock ? <Check size={15} /> : null}
            {variant.stock
              ? `${variant.stock} available${inBag ? ` · ${inBag} in your bag` : ''}`
              : t('Currently out of stock')}
          </p>
          <div className="add-to-bag">
            <div className="quantity-control">
              <button
                aria-label={t('Decrease quantity')}
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              >
                <Minus size={15} />
              </button>
              <output aria-label={t('Quantity')}>{quantity}</output>
              <button
                aria-label={t('Increase quantity')}
                disabled={quantity >= available}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className="button primary"
              disabled={!available}
              onClick={() => addToCart(product.id, variant.id, Math.min(quantity, available))}
            >
              {!variant.stock
                ? t('Sold out')
                : !available
                  ? t('All available stock in bag')
                  : t('Add to bag')}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="shipping-note">
            <Truck size={18} />
            {config.checkout.freeShippingThreshold ? (
              <>
                {t('Complimentary delivery from')}
                <Money amount={config.checkout.freeShippingThreshold} />
              </>
            ) : (
              t('Carefully packed for delivery')
            )}
          </p>
          <div className="product-accordions">
            <details open>
              <summary>{t('The details')}</summary>
              <ul>
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p>
                {t('Model:')} {product.model}
                <br />
                {t('SKU:')} {variant.sku}
              </p>
            </details>
            <details>
              <summary>{t('Delivery & returns')}</summary>
              <p>{config.checkout.notice}</p>
              <Link className="text-link" to="/shipping">
                {t('Read delivery information')} <ArrowRight size={15} />
              </Link>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('BETTER TOGETHER')}</span>
              <h2>{t('A few more favorites.')}</h2>
            </div>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
export default function Product() {
  const t = useText()

  const { slug } = useParams()
  const { products, provider, registerProduct, config } = useStore()
  const product = products.find((p) => p.slug === slug)
  const [resolvedSlug, setResolvedSlug] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (
      !provider.getProduct ||
      !slug ||
      (product && provider.mode !== 'api') ||
      resolvedSlug === config.locale + '|' + slug
    )
      return
    const controller = new AbortController()
    setError('')
    provider
      .getProduct(slug, controller.signal, {
        storeId: config.storeId,
        locale: config.locale,
        currency: config.currency,
      })
      .then((value) => {
        if (!controller.signal.aborted) {
          if (value) registerProduct(value)
          setResolvedSlug(config.locale + '|' + slug)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(t('We couldn’t load this product. Please reload to try again.'))
          setResolvedSlug(config.locale + '|' + slug)
        }
      })
    return () => controller.abort()
  }, [slug, product, provider, registerProduct, config.locale, resolvedSlug])
  if (!product && provider.getProduct && resolvedSlug !== config.locale + '|' + slug)
    return (
      <div className="startup-state" role="status">
        {t('Loading your next favorite…')}
      </div>
    )
  if (error && !product)
    return (
      <div className="startup-state" role="alert">
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          {t('Try again')}
        </button>
      </div>
    )
  return product ? (
    config.engine ? (
      <>
        <p className="page-width inline-error" role={error ? 'alert' : undefined}>
          {error}
        </p>
        <ConfiguredProduct
          key={product.id + product.variants.map((variant) => variant.id).join('|')}
          product={product}
        />
      </>
    ) : (
      <ProductView key={product.id} product={product} />
    )
  ) : (
    <EmptyState
      title={t('This one got away.')}
      text="We couldn’t find that product. Explore the rest of the collection."
    />
  )
}
