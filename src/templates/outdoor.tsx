import { ArrowRight, ArrowUpRight, Compass, Mountain } from 'lucide-react'
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
    <header className="site-header outdoor-header">
      {config.presentation.header.showAnnouncement && config.announcement && (
        <div className="outdoor-announcement">
          <span>{config.announcement}</span>
          <span>
            {config.currency} / {config.locale.split('-')[0].toUpperCase()}
          </span>
        </div>
      )}
      <div className="outdoor-header-main page-width">
        <div className="outdoor-identity">
          <div className="outdoor-brand">
            {config.brand.showSymbol && <Mountain size={28} strokeWidth={1.7} aria-hidden="true" />}
            <Brand />
          </div>
          {config.presentation.header.showTagline && (
            <span className="outdoor-tagline">{config.brand.tagline}</span>
          )}
        </div>
        <Navigation />
        <HeaderActions {...props} />
      </div>
      {props.menuOpen && <Navigation mobile />}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  return (
    <section className="outdoor-expedition page-width">
      <div className="outdoor-hero-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h1>{section.title}</h1>
        </div>
        <div className="outdoor-hero-intro">
          <p>{section.description}</p>
          <StoreLink className="button primary" href={section.cta.href}>
            {section.cta.label}
            <ArrowUpRight size={20} />
          </StoreLink>
          {section.secondaryCta && (
            <StoreLink className="text-link" href={section.secondaryCta.href}>
              {section.secondaryCta.label}
              <ArrowRight size={18} />
            </StoreLink>
          )}
        </div>
      </div>
      <div className="outdoor-panorama">
        <img
          data-section-image
          src={section.image}
          alt={section.imageAlt}
          width="1600"
          height="760"
          fetchPriority="high"
        />
        {section.edition && (
          <span className="outdoor-edition">
            <Compass size={25} strokeWidth={1} aria-hidden="true" />
            {section.edition}
          </span>
        )}
      </div>
      {(section.imageLabel || section.caption || section.footnote) && (
        <div className="outdoor-field-notes">
          <span>{section.imageLabel}</span>
          <span>{section.caption}</span>
          <span>{section.footnote}</span>
        </div>
      )}
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  if (!products.length) return null
  return (
    <section className="outdoor-equipment page-width">
      <div className="outdoor-section-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h2>{section.title}</h2>
          {section.description && <p className="section-description">{section.description}</p>}
        </div>
        <CollectionLink section={section} />
      </div>
      <div className="outdoor-equipment-grid">
        {products.map((product, i) => (
          <div className="outdoor-equipment-item" key={product.id}>
            <span className="outdoor-item-index">
              {String(i + 1).padStart(2, '0')} / {product.model}
            </span>
            <ProductCard product={product} options={section.card} />
          </div>
        ))}
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const categories = useSectionCategories(section)
  if (!categories.length) return null
  return (
    <section className="outdoor-routes page-width">
      <div className="outdoor-section-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h2>{section.title}</h2>
          {section.description && <p className="section-description">{section.description}</p>}
        </div>
        <Compass size={40} strokeWidth={1} aria-hidden="true" />
      </div>
      <div className="outdoor-route-grid">
        {categories.map((category, i) => (
          <StoreLink
            className="outdoor-route"
            key={category.id}
            href={`/catalog?category=${category.id}`}
          >
            <div className="outdoor-route-image">
              <img src={category.image} alt="" width="600" height="520" loading="lazy" />
              <span>{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="outdoor-route-title">
              <h3>{category.name}</h3>
              <ArrowUpRight size={24} />
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
    <section className="outdoor-dispatch page-width" data-has-image={Boolean(section.image)}>
      {section.image && (
        <div className="outdoor-dispatch-image">
          <img
            data-section-image
            src={section.image}
            alt={section.imageAlt}
            width="900"
            height="900"
            loading="lazy"
          />
        </div>
      )}
      <div className="outdoor-dispatch-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>{section.description}</p>
        <div className="section-actions">
          <StoreLink className="button primary" href={section.cta.href}>
            {section.cta.label}
            <ArrowUpRight size={19} />
          </StoreLink>
          {section.secondaryCta && (
            <StoreLink className="text-link" href={section.secondaryCta.href}>
              {section.secondaryCta.label}
              <ArrowRight size={18} />
            </StoreLink>
          )}
        </div>
      </div>
    </section>
  )
}
function Benefits() {
  const { config } = useStore()
  return (
    <section className="outdoor-standards page-width" aria-label="Shopping with us">
      {config.benefits.map((benefit, i) => (
        <div key={benefit.title}>
          <span className="eyebrow">{String(i + 1).padStart(2, '0')}</span>
          <h3>{benefit.title}</h3>
          <p>{benefit.description}</p>
        </div>
      ))}
    </section>
  )
}
function Footer() {
  const { config } = useStore()
  return (
    <footer className="site-footer outdoor-footer">
      <div className="page-width">
        <div className="outdoor-footer-heading">
          <div>
            <span className="eyebrow">{config.footer.eyebrow ?? config.brand.tagline}</span>
            <h2>{config.footer.text}</h2>
          </div>
          <FooterCta label="Pack for what's next" href="/catalog" />
        </div>
        <div className="outdoor-footer-directory">
          {config.presentation.footer.showDescription && (
            <div className="outdoor-footer-description">
              {config.brand.showSymbol && <Compass size={48} strokeWidth={1} aria-hidden="true" />}
              <p>{config.brand.description}</p>
            </div>
          )}
          <FooterDirectory categoriesTitle="FIND YOUR WAY" linksTitle="BASECAMP" />
        </div>
        {config.presentation.footer.showWordmark && (
          <div className="outdoor-footer-wordmark">
            <Brand />
          </div>
        )}
        <FooterLegal />
      </div>
    </footer>
  )
}
export const outdoorTemplate: StorefrontTemplate = {
  Header,
  Footer,
  Hero,
  Products,
  Categories,
  Banner,
  Benefits,
}
