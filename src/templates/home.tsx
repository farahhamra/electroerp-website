import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Leaf } from 'lucide-react'
import { selectSectionCategories } from '../core/sections'
import { useStore } from '../context/StoreContext'
import { ProductCard, StoreLink } from '../components/Shared'
import {
  Brand,
  Navigation,
  HeaderActions,
  FooterLegal,
  CollectionLink,
  useSectionProducts,
  useSectionCategories,
  FooterDirectory,
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
    <header className="site-header home-header">
      <div className="home-header-main page-width">
        <div className="home-brand">
          {config.brand.showSymbol && <Leaf size={25} strokeWidth={1.2} aria-hidden="true" />}
          <Brand />
        </div>
        <Navigation />
        <HeaderActions {...props} />
      </div>
      {props.menuOpen && <Navigation mobile />}
      {config.presentation.header.showAnnouncement && config.announcement && (
        <div className="home-announcement">
          <span>{config.announcement}</span>
        </div>
      )}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  const { categories } = useStore()
  const companions = selectSectionCategories(categories, section.companionCategoryIds)
    .filter((c) => c.image !== section.image)
    .slice(0, 2)
  return (
    <section className="home-welcome page-width">
      <div className="home-welcome-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
        <StoreLink className="button primary" href={section.cta.href}>
          {section.cta.label}
          <ArrowRight size={18} />
        </StoreLink>
        {section.secondaryCta && (
          <StoreLink className="text-link secondary-cta" href={section.secondaryCta.href}>
            {section.secondaryCta.label}
            <ArrowUpRight size={18} />
          </StoreLink>
        )}
      </div>
      <div className="home-scene">
        <span className="home-scene-note">{section.imageLabel ?? 'ROOM TO BE YOURSELF'}</span>
        {companions[0] && (
          <Link
            className="home-scene-side home-scene-left"
            to={`/catalog?category=${companions[0].id}`}
          >
            <img src={companions[0].image} alt={companions[0].name} width="600" height="520" />
            <span>
              {companions[0].name}
              <ArrowUpRight size={16} />
            </span>
          </Link>
        )}
        <div className="home-scene-main">
          <img
            src={section.image}
            alt={section.imageAlt}
            width="600"
            height="520"
            fetchPriority="high"
          />
        </div>
        {companions[1] && (
          <Link
            className="home-scene-side home-scene-right"
            to={`/catalog?category=${companions[1].id}`}
          >
            <img src={companions[1].image} alt={companions[1].name} width="600" height="520" />
            <span>
              {companions[1].name}
              <ArrowUpRight size={16} />
            </span>
          </Link>
        )}
        <span className="home-scene-caption">
          {section.caption ?? 'Good things take their time.'}
        </span>
      </div>
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  if (!products.length) return null
  return (
    <section className="home-favorites page-width">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h2>{section.title}</h2>
          {section.description && <p className="section-description">{section.description}</p>}
        </div>
        <CollectionLink section={section} />
      </div>
      <div className="home-favorites-grid">
        {products.map((product) => (
          <ProductCard product={product} key={product.id} options={section.card} />
        ))}
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const categories = useSectionCategories(section)
  if (!categories.length) return null
  return (
    <section className="home-rooms page-width">
      <div className="home-rooms-intro">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>{section.description ?? 'Small details. A place that feels like you.'}</p>
      </div>
      <div className="home-room-list">
        {categories.map((category, i) => (
          <Link key={category.id} className="home-room" to={`/catalog?category=${category.id}`}>
            <span className="home-room-number">0{i + 1}</span>
            <img src={category.image} alt="" loading="lazy" width="600" height="520" />
            <div>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </div>
            <span className="home-room-arrow">
              <ArrowUpRight size={24} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
function Banner({ section }: { section: BannerSection }) {
  return (
    <section className="home-journal page-width">
      {section.image && (
        <div className="home-journal-image">
          <img src={section.image} alt={section.imageAlt} loading="lazy" width="600" height="520" />
        </div>
      )}
      <div className="home-journal-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>{section.description}</p>
        <StoreLink className="text-link" href={section.cta.href}>
          {section.cta.label}
          <ArrowRight size={18} />
        </StoreLink>
        {section.secondaryCta && (
          <StoreLink className="text-link secondary-cta" href={section.secondaryCta.href}>
            {section.secondaryCta.label}
            <ArrowUpRight size={18} />
          </StoreLink>
        )}
      </div>
    </section>
  )
}
function Benefits() {
  const { config } = useStore()
  return (
    <section className="home-promises page-width" aria-label="Shopping with us">
      <Leaf size={36} strokeWidth={1} aria-hidden="true" />
      <div>
        {config.benefits.map((benefit) => (
          <div key={benefit.title}>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
function Footer() {
  const { config } = useStore()
  return (
    <footer
      className="site-footer home-footer"
      data-custom-columns={config.footer.columns.length > 0}
      data-show-categories={config.presentation.footer.showCategories}
    >
      <div className="page-width">
        <div className="home-footer-invitation">
          <span className="eyebrow">{config.footer.eyebrow ?? 'MAKE YOURSELF AT HOME'}</span>
          <h2>{config.footer.text}</h2>
          <StoreLink href={config.footer.cta?.href ?? '/catalog'} className="home-footer-cta">
            <span className="sr-only">{config.footer.cta?.label ?? 'Explore the collection'}</span>
            <ArrowUpRight size={38} strokeWidth={1} />
          </StoreLink>
        </div>
        <div className="home-footer-links">
          <div>
            <Brand />
            {config.presentation.footer.showDescription && <p>{config.brand.description}</p>}
          </div>
          <FooterDirectory categoriesTitle="FIND YOUR CORNER" linksTitle="THE FINER DETAILS" />
        </div>
        <FooterLegal />
      </div>
    </footer>
  )
}
export const homeTemplate: StorefrontTemplate = {
  Header,
  Footer,
  Hero,
  Products,
  Categories,
  Banner,
  Benefits,
}
