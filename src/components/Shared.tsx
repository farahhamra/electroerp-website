import { useText } from '../core/i18n/useText'
import type { ReactNode } from 'react'
import { Link } from './StoreRouterLink'
import { ArrowUpRight, Plus } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { formatMoney } from '../core/cart'
import type { z } from 'zod'
import type { cardOptionsSchema } from '../core/presentation'
import type { Product } from '../core/schema'

export function StoreLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  if (!href)
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    )
  return /^(https:\/\/|tel:|mailto:)/.test(href) ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link to={href} className={className}>
      {children}
    </Link>
  )
}
export function Money({ amount }: { amount: number }) {
  const { config } = useStore()
  return <>{formatMoney(amount, config)}</>
}
export function ProductCard({
  product,
  options,
  preferredVariantId,
}: {
  product: Product
  preferredVariantId?: string
  options?: Partial<z.infer<typeof cardOptionsSchema>>
}) {
  const t = useText()

  const { addToCart, config } = useStore()
  const card = { ...config.presentation.productCard, ...options }
  const preferred = product.variants.find((v) => v.id === preferredVariantId)
  const available = preferred
    ? preferred.stock > 0
      ? preferred
      : undefined
    : product.variants.find((v) => v.stock > 0)
  const price = preferred?.price ?? Math.min(...product.variants.map((v) => v.price))
  const requiresSelection = product.variants.some((v) => 'Size' in v.options)
  return (
    <article
      className="product-card"
      data-image-ratio={card.imageRatio}
      data-image-fit={card.imageFit}
    >
      <div className="product-image-wrap">
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <img src={product.images[0]} alt="" loading="lazy" width="600" height="520" />
        </Link>
        {((card.showBadge && product.badge) || !available) && (
          <span className="product-badge">{!available ? t('Sold out') : product.badge}</span>
        )}
        {card.quickAdd &&
          (requiresSelection ? (
            <Link
              className="quick-add"
              to={`/products/${product.slug}`}
              aria-label={t('Choose options for {value0}', { value0: product.name })}
            >
              <ArrowUpRight size={18} />
            </Link>
          ) : (
            <button
              className="quick-add"
              disabled={!available}
              aria-label={t('Add {value0} to bag', { value0: product.name })}
              onClick={() => available && addToCart(product.id, available.id, 1, product)}
            >
              <Plus size={19} />
            </button>
          ))}
      </div>
      <div className="product-info">
        <div>
          {card.showCategory && <p className="product-category">{product.categoryName}</p>}
          {card.showBrand && <p className="product-brand">{product.brand}</p>}
          <Link className="product-name" to={`/products/${product.slug}`}>
            {product.name}
          </Link>
          {card.showOptions && (
            <p className="product-options">
              {product.variants.length > 1
                ? t('options.count', { count: product.variants.length })
                : t('Considered in every detail')}
            </p>
          )}
        </div>
        <span className="product-price">
          <Money amount={price} />
        </span>
      </div>
    </article>
  )
}
export function EmptyState({
  title,
  text,
  action = 'Explore the collection',
  href = '/catalog',
}: {
  title: string
  text: string
  action?: string
  href?: string
}) {
  const t = useText()

  return (
    <div className="empty-state">
      <span className="eyebrow">{t('A LITTLE SPACE')}</span>
      <h1>{t(title)}</h1>
      <p>{t(text)}</p>
      <Link className="button primary" to={href}>
        {t(action)}
        <ArrowUpRight size={18} />
      </Link>
    </div>
  )
}
