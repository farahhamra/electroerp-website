import { useText } from '../core/i18n/useText'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useStore } from '../context/StoreContext'
import type { Section } from '../core/schema'
import { ProductCard, StoreLink } from '../components/Shared'
import { CollectionLink, useSectionCategories, useSectionProducts } from './shared'
import type { BannerSection, CategoriesSection, HeroSection, ProductsSection } from './types'

function Heading({
  section,
}: {
  section: { eyebrow: string; title: string; description?: string }
}) {
  return (
    <div className="config-section-heading">
      <span className="eyebrow">{section.eyebrow}</span>
      <h2>{section.title}</h2>
      {section.description && <p>{section.description}</p>}
    </div>
  )
}
export function MediaSection({ section }: { section: HeroSection | BannerSection }) {
  const Title = section.type === 'hero' ? 'h1' : 'h2'
  return (
    <section
      className={`config-media page-width media-${section.layout}`}
      data-image-side={section.imageSide}
      data-has-image={Boolean(section.image)}
    >
      <div className="config-media-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <Title>{section.title}</Title>
        <p>{section.description}</p>
        <div className="section-actions">
          <StoreLink className="button primary" href={section.cta.href}>
            {section.cta.label}
            <ArrowUpRight size={18} />
          </StoreLink>
          {section.secondaryCta && (
            <StoreLink className="text-link" href={section.secondaryCta.href}>
              {section.secondaryCta.label}
              <ArrowUpRight size={18} />
            </StoreLink>
          )}
        </div>
        {section.type === 'hero' && section.footnote && (
          <p className="config-footnote">{section.footnote}</p>
        )}
      </div>
      {section.image && (
        <figure className="config-media-image">
          <img
            src={section.image}
            alt={section.imageAlt}
            width="600"
            height="520"
            loading={section.type === 'hero' ? 'eager' : 'lazy'}
            fetchPriority={section.type === 'hero' ? 'high' : 'auto'}
          />
          {section.type === 'hero' && section.caption && <figcaption>{section.caption}</figcaption>}
        </figure>
      )}
    </section>
  )
}
export function Products({ section }: { section: ProductsSection }) {
  const t = useText()

  const products = useSectionProducts(section)
  if (!products.length) return null
  return (
    <section className="config-products page-width">
      <div className="section-heading">
        <Heading section={section} />
        <CollectionLink section={section} />
      </div>
      <div
        className={`config-products-${section.layout}`}
        style={
          {
            '--columns': section.columns,
            '--tablet-columns': Math.min(section.columns, 2),
            '--mobile-columns': section.mobileColumns,
          } as CSSProperties
        }
        role={section.layout === 'rail' ? 'region' : undefined}
        aria-label={section.layout === 'rail' ? section.title : undefined}
        tabIndex={section.layout === 'rail' ? 0 : undefined}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} options={section.card} />
        ))}
      </div>
    </section>
  )
}
export function Categories({ section }: { section: CategoriesSection }) {
  const categories = useSectionCategories(section)
  if (!categories.length) return null
  return (
    <section className="config-categories page-width">
      <Heading section={section} />
      <div
        className={`config-categories-${section.layout}`}
        style={
          {
            '--columns': section.columns,
            '--tablet-columns': Math.min(section.columns, 2),
          } as CSSProperties
        }
      >
        {categories.map((category) => (
          <StoreLink
            className="config-category"
            key={category.id}
            href={`/catalog?category=${category.id}`}
          >
            <img src={category.image} alt="" width="600" height="520" loading="lazy" />
            <div>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </div>
            <ArrowUpRight size={22} />
          </StoreLink>
        ))}
      </div>
    </section>
  )
}
export function ContentSection({
  section,
}: {
  section: Extract<Section, { type: 'text' | 'faq' | 'benefits' }>
}) {
  const t = useText()

  const { config } = useStore()
  if (section.type === 'benefits')
    return (
      <section className="config-benefits page-width" aria-label={t('Shopping with us')}>
        {(section.items ?? config.benefits).map((benefit, i) => (
          <div key={`${benefit.title}-${i}`}>
            <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </div>
        ))}
      </section>
    )
  if (section.type === 'faq')
    return (
      <section className="config-faq page-width">
        <Heading section={section} />
        <div>
          {section.items.map((item, i) => (
            <details key={i}>
              <summary>
                {item.question}
                <ChevronDown size={18} aria-hidden="true" />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    )
  return (
    <section className={`config-text text-${section.layout} page-width`}>
      <Heading section={section} />
      <div className="config-text-body">
        {section.paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
        {section.cta && (
          <StoreLink className="text-link" href={section.cta.href}>
            {section.cta.label}
            <ArrowUpRight size={18} />
          </StoreLink>
        )}
      </div>
    </section>
  )
}
