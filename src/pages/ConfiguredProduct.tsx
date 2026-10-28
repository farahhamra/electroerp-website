import { pagePath } from '../core/routing/links'
import { variantLabel } from '../core/i18n/content'
import { useText } from '../core/i18n/useText'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Minus, Plus, Check } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { Link } from '../components/StoreRouterLink'
import { Money } from '../components/Shared'
import type { Product } from '../core/schema'
import { CollectionProducts } from '../sections/CollectionSection'
import { designCSS } from '../core/theme/styles'
export default function ConfiguredProduct({ product }: { product: Product }) {
  const t = useText()

  const { config, cart, addToCart } = useStore(),
    settings = config.engine!.commerce.products[product.id] ?? config.engine!.commerce.product
  const [variantId, setVariantId] = useState(
      product.variants.find((v) => v.stock > 0)?.id ?? product.variants[0].id,
    ),
    [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(product.images[0])
  const variant = product.variants.find((v) => v.id === variantId)!,
    inBag =
      cart.find((l) => l.productId === product.id && l.variantId === variantId)?.quantity ?? 0,
    available = Math.max(0, variant.stock - inBag)
  const shippingPage = config.engine!.pages.find((page) => page.id === 'shipping' && page.enabled)
  const related = {
    ...settings.related,
    excludeIds: [...(settings.related?.excludeIds ?? []), product.id],
    limit: settings.related?.limit ?? 4,
    ...(settings.relatedBy === 'category'
      ? { categoryIds: [product.categoryId] }
      : settings.relatedBy === 'brand'
        ? { brands: [product.brand] }
        : {}),
  }
  const blocks = {
    gallery: (
      <div className={`configured-gallery gallery-${settings.gallery}`}>
        {settings.gallery === 'stacked' ? (
          product.images.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`${product.name}, ${i + 1}`}
              width="800"
              height="700"
              loading={i ? 'lazy' : 'eager'}
            />
          ))
        ) : settings.gallery === 'rail' ? (
          <div
            className="product-gallery-rail"
            role="region"
            aria-label={t('Product images')}
            tabIndex={0}
          >
            {[...new Set([image, ...product.images])].map((src, i) => (
              <figure key={src}>
                <img
                  src={src}
                  alt={`${product.name}, ${i + 1}`}
                  width="800"
                  height="700"
                  loading={i ? 'lazy' : 'eager'}
                />
              </figure>
            ))}
          </div>
        ) : (
          <>
            <img
              className="detail-image"
              src={image}
              alt={`${product.name}, ${Object.values(variant.options).join(', ')}`}
              width="800"
              height="700"
            />
            <div className="thumbnails" role="group" aria-label={t('Product images')}>
              {product.images.map((src, i) => (
                <button
                  key={src}
                  aria-label={t('View image {value0}', { value0: i + 1 })}
                  aria-pressed={image === src}
                  onClick={() => setImage(src)}
                >
                  <img src={src} alt="" width="100" height="100" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    ),
    title: (
      <div>
        <span className="eyebrow">
          {product.brand} / {product.categoryName}
        </span>
        <h1>{product.name}</h1>
        <p>
          <bdi>{product.model}</bdi>
        </p>
      </div>
    ),
    price: (
      <div className="detail-price">
        <Money amount={variant.price} />
        {variant.compareAtPrice && variant.compareAtPrice > variant.price ? (
          <del>
            <Money amount={variant.compareAtPrice} />
          </del>
        ) : null}
      </div>
    ),
    variants: (
      <fieldset className="variant-options">
        <legend>{t('Choose your option')}</legend>
        {product.variants.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={variant.id === v.id}
            className={variant.id === v.id ? 'selected' : ''}
            onClick={() => {
              setVariantId(v.id)
              setQuantity(1)
              setImage(v.image ?? product.images[0])
            }}
          >
            {variantLabel(v, config.locale) || t('Standard')}
            {!v.stock ? ` · ${t('Sold out')}` : ''}
          </button>
        ))}
      </fieldset>
    ),
    availability: (
      <p className="availability">
        {variant.stock ? (
          <>
            <Check size={16} /> {t('stock.count', { count: variant.stock })}
            {inBag ? ` · ${t('{count} in your bag', { count: inBag })}` : ''}
          </>
        ) : (
          t('Currently out of stock')
        )}
      </p>
    ),
    purchase: (
      <div className="add-to-bag">
        <div className="quantity-control">
          <button
            aria-label={t('Decrease quantity')}
            disabled={quantity <= 1}
            onClick={() => setQuantity((q) => q - 1)}
          >
            <Minus size={16} />
          </button>
          <output aria-label={t('Quantity')}>{quantity}</output>
          <button
            aria-label={t('Increase quantity')}
            disabled={quantity >= available}
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          className="button primary"
          disabled={!available}
          onClick={() => addToCart(product.id, variant.id, Math.min(quantity, available))}
        >
          {available
            ? t('Add to bag')
            : variant.stock
              ? t('All available stock in bag')
              : t('Sold out')}
          <ArrowRight size={18} />
        </button>
      </div>
    ),
    description: <p className="detail-description">{product.description}</p>,
    specifications: (
      <section>
        <h2>{t('The details')}</h2>
        {product.specifications?.length ? (
          <>
            {[...new Set(product.specifications.map((s) => s.group))].map((group) => (
              <div key={group}>
                <h3>{group}</h3>
                <dl className="product-specifications">
                  {product
                    .specifications!.filter((s) => s.group === group)
                    .map((s, i) => (
                      <div key={i}>
                        <dt>{s.label}</dt>
                        <dd>
                          {s.value} {s.unit}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            ))}
          </>
        ) : (
          <ul>
            {product.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        <p>
          {t('SKU:')}
          <bdi>{variant.sku}</bdi>
        </p>
      </section>
    ),
    delivery: (
      <details className="product-accordions">
        <summary>{t('Delivery & returns')}</summary>
        <p>{config.checkout.notice}</p>
        <>
          {shippingPage && (
            <Link to={pagePath(shippingPage, config.engine!, config.locale)} className="text-link">
              {t('Read delivery information')}
            </Link>
          )}
        </>
      </details>
    ),
    related: (
      <section className="section">
        <div className="section-heading">
          <h2>{t('A few more favorites.')}</h2>
        </div>
        <CollectionProducts query={related} />
      </section>
    ),
  }
  return (
    <div className="page-width product-page configured-product">
      {settings.design && <style>{designCSS(settings.design, '.configured-product')}</style>}
      <Link to="/catalog" className="back-link">
        <ArrowLeft size={16} />
        {t('Back to the collection')}
      </Link>
      <div className="configured-product-regions">
        <div>
          {settings.regions.media.map((block) => (
            <div className="product-block" key={block}>
              {blocks[block]}
            </div>
          ))}
        </div>
        <div
          className={settings.stickySummary ? 'product-summary sticky-summary' : 'product-summary'}
        >
          {settings.regions.summary.map((block) => (
            <div className="product-block" key={block}>
              {blocks[block]}
            </div>
          ))}
        </div>
      </div>
      <div>
        {settings.regions.details.map((block) => (
          <div className="product-block" key={block}>
            {blocks[block]}
          </div>
        ))}
      </div>
    </div>
  )
}
