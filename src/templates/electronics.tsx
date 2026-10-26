import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Sparkles,
  PackageCheck,
  HeartHandshake,
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { ProductCard, StoreLink } from '../components/Shared'
import {
  Brand,
  Navigation,
  HeaderActions,
  FooterLinks,
  FooterLegal,
  CollectionLink,
  useSectionProducts,
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
    <header className="site-header tech-header">
      <div className="tech-utility">
        <div className="page-width">
          <span>{config.announcement || config.brand.tagline}</span>
          <span>
            {config.currency} / {config.locale.split('-')[0].toUpperCase()}
          </span>
        </div>
      </div>
      <div className="tech-header-main page-width">
        <Brand />
        <button className="tech-search-button" onClick={props.onSearch} aria-label="Open search">
          <Search size={19} />
          <span>Find your next upgrade</span>
          <span className="search-button-hint">Explore</span>
        </button>
        <HeaderActions {...props} showSearch={false} />
      </div>
      <div className="tech-navigation page-width">
        <Navigation />
        <span className="tech-nav-note">
          <span className="small-dot" />
          {config.brand.tagline}
        </span>
      </div>
      {props.menuOpen && <Navigation mobile />}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  const { config } = useStore()
  return (
    <section className="hero hero-electronics page-width">
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="small-dot" />
          {section.eyebrow}
        </span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
        <StoreLink className="button primary" href={section.cta.href}>
          {section.cta.label}
          <ArrowUpRight size={18} />
        </StoreLink>
        <div className="hero-footnote">
          <span className="line" />
          DESIGNED AROUND YOU. ALWAYS.
        </div>
      </div>
      <div className="hero-art">
        <div className="hero-orbit" />
        <img
          src={section.image}
          alt={section.imageAlt}
          width="600"
          height="520"
          fetchPriority="high"
        />
        <span className="hero-art-label">
          <span className="small-dot" />A NEW KIND OF EVERYDAY
        </span>
        <span className="hero-edition">
          THE {config.brand.name} EDIT
          <br />
          <strong>VOL. 01</strong>
        </span>
      </div>
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  return (
    <section className="section page-width tech-products">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h2>{section.title}</h2>
        </div>
        <CollectionLink section={section} />
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const { categories } = useStore()
  return (
    <section className="tech-categories page-width">
      <div>
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="tech-category-grid">
        {categories.map((category, i) => (
          <Link to={`/catalog?category=${category.id}`} className="tech-category" key={category.id}>
            <span className="category-index">0{i + 1}</span>
            <img src={category.image} alt="" loading="lazy" width="600" height="520" />
            <div>
              <h3>{category.name}</h3>
              <span>{category.description}</span>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
    </section>
  )
}
function Banner({ section }: { section: BannerSection }) {
  return (
    <section className="editorial-banner page-width tech-banner">
      <div className="banner-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>{section.description}</p>
        <StoreLink className="button light" href={section.cta.href}>
          {section.cta.label}
          <ArrowRight size={18} />
        </StoreLink>
      </div>
      {section.image && <img src={section.image} alt="" loading="lazy" width="600" height="520" />}
    </section>
  )
}
function Benefits() {
  const { config } = useStore()
  const icons = [Sparkles, PackageCheck, HeartHandshake]
  return (
    <section className="benefits page-width" aria-label="Shopping with us">
      {config.benefits.map((benefit, index) => {
        const Icon = icons[index % icons.length]
        return (
          <div key={benefit.title}>
            <Icon size={26} strokeWidth={1.4} />
            <div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </div>
          </div>
        )
      })}
    </section>
  )
}
function Footer() {
  const { config, categories } = useStore()
  return (
    <footer className="site-footer tech-footer">
      <div className="page-width">
        <div className="tech-footer-grid">
          <div className="tech-footer-brand">
            <Brand />
            <h2>{config.brand.tagline}</h2>
            <p>{config.brand.description}</p>
            <Link className="text-link" to="/catalog">
              Find your next upgrade
              <ArrowRight size={17} />
            </Link>
          </div>
          <div>
            <span className="eyebrow">EXPLORE</span>
            <nav aria-label="Footer categories">
              {categories.map((c) => (
                <Link key={c.id} to={`/catalog?category=${c.id}`}>
                  {c.name}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <span className="eyebrow">HERE FOR YOU</span>
            <FooterLinks />
          </div>
        </div>
        <div className="tech-footer-statement">
          <span className="small-dot" />
          {config.footer.text}
          <span className="tech-footer-line" />
        </div>
        <FooterLegal />
      </div>
    </footer>
  )
}
export const electronicsTemplate: StorefrontTemplate = {
  Header,
  Footer,
  Hero,
  Products,
  Categories,
  Banner,
  Benefits,
}
