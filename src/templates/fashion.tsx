import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
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
    <header className="site-header fashion-header">
      <div className="fashion-masthead page-width">
        <span className="fashion-masthead-note">{config.announcement || config.brand.tagline}</span>
        <Brand />
        <HeaderActions {...props} />
      </div>
      <div className="fashion-navigation">
        <Navigation />
      </div>
      {props.menuOpen && <Navigation mobile />}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  return (
    <section className="fashion-cover">
      <div className="fashion-cover-art">
        <img
          src={section.image}
          alt={section.imageAlt}
          width="600"
          height="520"
          fetchPriority="high"
        />
        <span className="fashion-cover-index" aria-hidden="true">
          01
        </span>
      </div>
      <div className="fashion-cover-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h1>{section.title}</h1>
        <StoreLink className="text-link" href={section.cta.href}>
          {section.cta.label}
          <ArrowUpRight size={20} />
        </StoreLink>
      </div>
      <div className="fashion-cover-caption">
        <span>THE CONSIDERED COLLECTION</span>
        <p>{section.description}</p>
        <ArrowRight size={24} aria-hidden="true" />
      </div>
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  return (
    <section className="fashion-edit page-width">
      <div className="fashion-edit-intro">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <CollectionLink section={section} />
      </div>
      <div className="fashion-edit-products">
        {products.map((product, index) => (
          <div className="fashion-edit-item" key={product.id}>
            <span className="fashion-look-number">LOOK / {String(index + 1).padStart(2, '0')}</span>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const { categories } = useStore()
  return (
    <section className="fashion-collections page-width">
      <div className="fashion-collections-title">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="fashion-collection-grid">
        {categories.map((category, i) => (
          <Link
            to={`/catalog?category=${category.id}`}
            className="fashion-collection"
            key={category.id}
          >
            <div>
              <img src={category.image} alt="" loading="lazy" width="600" height="520" />
            </div>
            <span className="fashion-collection-caption">
              <span className="eyebrow">0{i + 1} / COLLECTION</span>
              <h3>{category.name}</h3>
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
    <section className="fashion-story">
      <div className="fashion-story-heading">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
      </div>
      {section.image && (
        <div className="fashion-story-image">
          <img src={section.image} alt="" loading="lazy" width="600" height="520" />
        </div>
      )}
      <div className="fashion-story-caption">
        <p>{section.description}</p>
        <StoreLink className="text-link" href={section.cta.href}>
          {section.cta.label}
          <ArrowUpRight size={18} />
        </StoreLink>
      </div>
    </section>
  )
}
function Benefits() {
  const { config } = useStore()
  return (
    <section className="fashion-values page-width" aria-label="Shopping with us">
      {config.benefits.map((benefit, i) => (
        <div key={benefit.title}>
          <span className="eyebrow">0{i + 1}</span>
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
    <footer className="site-footer fashion-footer">
      <div className="page-width">
        <div className="fashion-footer-top">
          <div>
            <span className="eyebrow">THE STUDIO</span>
            <h2>{config.footer.text}</h2>
            <Link className="text-link" to="/story">
              Our point of view
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <FooterLinks />
          <p>{config.brand.description}</p>
        </div>
        <div className="fashion-footer-wordmark">
          <Brand />
        </div>
        <FooterLegal />
      </div>
    </footer>
  )
}
export const fashionTemplate: StorefrontTemplate = {
  Header,
  Footer,
  Hero,
  Products,
  Categories,
  Banner,
  Benefits,
}
