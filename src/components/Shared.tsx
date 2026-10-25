import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { formatMoney } from '../core/cart'
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
  return href.startsWith('https://') ? (
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
export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore()
  const available = product.variants.find((v) => v.stock > 0)
  const price = Math.min(...product.variants.map((v) => v.price))
  const requiresSelection = product.variants.some((v) => 'Size' in v.options)
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <img src={product.images[0]} alt="" loading="lazy" width="600" height="520" />
        </Link>
        {(product.badge || !available) && (
          <span className="product-badge">{!available ? 'Sold out' : product.badge}</span>
        )}
        {requiresSelection ? (
          <Link
            className="quick-add"
            to={`/products/${product.slug}`}
            aria-label={`Choose options for ${product.name}`}
          >
            <ArrowUpRight size={18} />
          </Link>
        ) : (
          <button
            className="quick-add"
            disabled={!available}
            aria-label={`Add ${product.name} to bag`}
            onClick={() => available && addToCart(product.id, available.id)}
          >
            <Plus size={19} />
          </button>
        )}
      </div>
      <div className="product-info">
        <div>
          <p className="product-category">{product.categoryName}</p>
          <Link className="product-name" to={`/products/${product.slug}`}>
            {product.name}
          </Link>
          <p className="product-options">
            {product.variants.length > 1
              ? `${product.variants.length} options`
              : 'Considered in every detail'}
          </p>
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
  return (
    <div className="empty-state">
      <span className="eyebrow">A LITTLE SPACE</span>
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="button primary" to={href}>
        {action}
        <ArrowUpRight size={18} />
      </Link>
    </div>
  )
}
