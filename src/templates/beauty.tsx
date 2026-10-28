import { useText } from '../core/i18n/useText'
import { ArrowRight, ArrowUpRight, Flower2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { ProductCard, StoreLink } from '../components/Shared'
import {
  Brand,
  Navigation,
  HeaderActions,
  FooterDirectory,
  FooterLegal,
  FooterCta,
  CollectionLink,
  useSectionProducts,
  useSectionCategories,
} from './shared'
import type {
  BannerSection,
  CategoriesSection,
  HeaderProps,
  HeroSection,
  ProductsSection,
  StorefrontTemplate,
} from './types'

function Header(props: HeaderProps) {
  const { config } = useStore()
  return (
    <header className="site-header beauty-header">
      {config.presentation.header.showAnnouncement && config.announcement && (
        <div className="beauty-announcement">{config.announcement}</div>
      )}
      <div className="beauty-header-main page-width">
        <div className="beauty-brand">
          {config.brand.showSymbol && <Flower2 size={25} strokeWidth={1.2} aria-hidden="true" />}
          <Brand />
        </div>
        <Navigation />
        <HeaderActions {...props} />
      </div>
      {props.menuOpen && <Navigation mobile />}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  const { config } = useStore()
  return (
    <section className="beauty-introduction page-width">
      <div className="beauty-hero-art">
        <img
          data-section-image
          src={section.image}
          alt={section.imageAlt}
          width="900"
          height="1000"
          fetchPriority="high"
        />
        {(section.imageLabel || section.edition) && (
          <div className="beauty-image-note">
            <span>{section.imageLabel}</span>
            <span>{section.edition}</span>
          </div>
        )}
      </div>
      <div className="beauty-hero-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
        <div className="section-actions">
          <StoreLink className="button primary" href={section.cta.href}>
            {section.cta.label}
            <ArrowRight size={18} />
          </StoreLink>
          {section.secondaryCta && (
            <StoreLink className="text-link" href={section.secondaryCta.href}>
              {section.secondaryCta.label}
              <ArrowUpRight size={18} />
            </StoreLink>
          )}
        </div>
        <div className="beauty-hero-signoff">
          {config.brand.showSymbol && <Flower2 size={32} strokeWidth={1} aria-hidden="true" />}
          {(section.footnote || config.presentation.header.showTagline) && (
            <span>{section.footnote ?? config.brand.tagline}</span>
          )}
        </div>
        {section.caption && <p className="beauty-hero-caption">{section.caption}</p>}
      </div>
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  if (!products.length) return null
  return (
    <section className="beauty-shelf page-width">
      <div className="beauty-section-title">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        {section.description && <p>{section.description}</p>}
      </div>
      <div className="beauty-product-shelf">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} options={section.card} />
        ))}
      </div>
      <div className="beauty-shelf-link">
        <CollectionLink section={section} />
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const categories = useSectionCategories(section)
  if (!categories.length) return null
  return (
    <section className="beauty-rituals page-width">
      <div className="beauty-section-title">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        {section.description && <p>{section.description}</p>}
      </div>
      <div className="beauty-ritual-grid">
        {categories.map((category, i) => (
          <StoreLink
            key={category.id}
            href={`/catalog?category=${category.id}`}
            className="beauty-ritual"
          >
            <div className="beauty-ritual-image">
              <img src={category.image} alt="" width="600" height="600" loading="lazy" />
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div>
              <h3>{category.name}</h3>
              <ArrowUpRight size={21} />
            </div>
            <p>{category.description}</p>
          </StoreLink>
        ))}
      </div>
    </section>
  )
}
function Banner({ section }: { section: BannerSection }) {
  return (
    <section className="beauty-note page-width" data-has-image={Boolean(section.image)}>
      <div className="beauty-note-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>{section.description}</p>
        <div className="section-actions">
          <StoreLink className="text-link" href={section.cta.href}>
            {section.cta.label}
            <ArrowRight size={18} />
          </StoreLink>
          {section.secondaryCta && (
            <StoreLink className="text-link" href={section.secondaryCta.href}>
              {section.secondaryCta.label}
              <ArrowUpRight size={18} />
            </StoreLink>
          )}
        </div>
      </div>
      {section.image && (
        <div className="beauty-note-image">
          <img
            data-section-image
            src={section.image}
            alt={section.imageAlt}
            width="600"
            height="600"
            loading="lazy"
          />
        </div>
      )}
    </section>
  )
}
function Benefits() {
  const t = useText()

  const { config } = useStore()
  return (
    <section className="beauty-values page-width" aria-label={t('Shopping with us')}>
      {config.benefits.map((benefit, i) => (
        <div key={benefit.title}>
          <span className="beauty-value-number">{String(i + 1).padStart(2, '0')}</span>
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </div>
      ))}
    </section>
  )
}
function Footer() {
  const t = useText()

  const { config } = useStore()
  return (
    <footer className="site-footer beauty-footer">
      <div className="page-width">
        <div className="beauty-footer-panel">
          <div className="beauty-farewell">
            <span className="eyebrow">{config.footer.eyebrow ?? config.brand.tagline}</span>
            <h2>{config.footer.text}</h2>
            {config.presentation.footer.showDescription && <p>{config.brand.description}</p>}
            <FooterCta label={t('Find your ritual')} href="/catalog" />
          </div>
          <div className="beauty-footer-details">
            {config.presentation.footer.showWordmark && (
              <div className="beauty-footer-brand">
                <Brand />
                {config.brand.showSymbol && (
                  <Flower2 size={35} strokeWidth={1} aria-hidden="true" />
                )}
              </div>
            )}
            <div className="beauty-footer-directory">
              <FooterDirectory categoriesTitle="THE RITUALS" linksTitle="A LITTLE GUIDANCE" />
            </div>
          </div>
        </div>
        <FooterLegal />
      </div>
    </footer>
  )
}
export const beautyTemplate: StorefrontTemplate = {
  Header,
  Footer,
  Hero,
  Products,
  Categories,
  Banner,
  Benefits,
}
