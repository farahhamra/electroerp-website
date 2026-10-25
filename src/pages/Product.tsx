import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Truck } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { EmptyState, Money, ProductCard } from '../components/Shared'
import type { Product as ProductType } from '../core/schema'

function ProductView({ product }: { product: ProductType }) {
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
        Back to the collection
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
                  aria-label={`View image ${index + 1}`}
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
            <legend>Choose your option</legend>
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
                {Object.values(v.options).join(' / ') || 'Standard'}
                {v.stock === 0 ? ' · Sold out' : ''}
              </button>
            ))}
          </fieldset>
          <p className={`availability ${variant.stock ? '' : 'sold-out'}`}>
            {variant.stock ? <Check size={15} /> : null}
            {variant.stock
              ? `${variant.stock} available${inBag ? ` · ${inBag} in your bag` : ''}`
              : 'Currently out of stock'}
          </p>
          <div className="add-to-bag">
            <div className="quantity-control">
              <button
                aria-label="Decrease quantity"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => q - 1)}
              >
                <Minus size={15} />
              </button>
              <output aria-label="Quantity">{quantity}</output>
              <button
                aria-label="Increase quantity"
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
                ? 'Sold out'
                : !available
                  ? 'All available stock in bag'
                  : 'Add to bag'}
              <ArrowRight size={18} />
            </button>
          </div>
          <p className="shipping-note">
            <Truck size={18} />
            {config.checkout.freeShippingThreshold ? (
              <>
                Complimentary delivery from <Money amount={config.checkout.freeShippingThreshold} />
              </>
            ) : (
              'Carefully packed for delivery'
            )}
          </p>
          <div className="product-accordions">
            <details open>
              <summary>The details</summary>
              <ul>
                {product.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p>
                Model: {product.model}
                <br />
                SKU: {variant.sku}
              </p>
            </details>
            <details>
              <summary>Delivery & returns</summary>
              <p>{config.checkout.notice}</p>
              <Link className="text-link" to="/shipping">
                Read delivery information <ArrowRight size={15} />
              </Link>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BETTER TOGETHER</span>
              <h2>A few more favorites.</h2>
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
  const { slug } = useParams()
  const { products, provider, registerProduct } = useStore()
  const product = products.find((p) => p.slug === slug)
  const [resolvedSlug, setResolvedSlug] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (product || !provider.getProduct || !slug) return
    const controller = new AbortController()
    setError('')
    provider
      .getProduct(slug, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          if (value) registerProduct(value)
          setResolvedSlug(slug)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('We couldn’t load this product. Please reload to try again.')
          setResolvedSlug(slug)
        }
      })
    return () => controller.abort()
  }, [slug, product, provider, registerProduct])
  if (!product && provider.getProduct && resolvedSlug !== slug)
    return (
      <div className="startup-state" role="status">
        Loading your next favorite…
      </div>
    )
  if (error && !product)
    return (
      <div className="startup-state" role="alert">
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    )
  return product ? (
    <ProductView key={product.id} product={product} />
  ) : (
    <EmptyState
      title="This one got away."
      text="We couldn’t find that product. Explore the rest of the collection."
    />
  )
}
