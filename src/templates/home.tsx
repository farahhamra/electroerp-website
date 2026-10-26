import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Leaf } from 'lucide-react'
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
    <header className="site-header home-header">
      <div className="home-header-main page-width">
        <div className="home-brand">
          <Leaf size={25} strokeWidth={1.2} aria-hidden="true" />
          <Brand />
        </div>
        <Navigation />
        <HeaderActions {...props} />
      </div>
      {props.menuOpen && <Navigation mobile />}
      {config.announcement && (
        <div className="home-announcement">
          <span>{config.announcement}</span>
        </div>
      )}
    </header>
  )
}
function Hero({ section }: { section: HeroSection }) {
  const { categories } = useStore()
  const companions = categories.filter((c) => c.image !== section.image).slice(0, 2)
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
      </div>
      <div className="home-scene">
        <span className="home-scene-note">ROOM TO BE YOURSELF</span>
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
        <span className="home-scene-caption">Good things take their time.</span>
      </div>
    </section>
  )
}
function Products({ section }: { section: ProductsSection }) {
  const products = useSectionProducts(section)
  return (
    <section className="home-favorites page-width">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{section.eyebrow}</span>
          <h2>{section.title}</h2>
        </div>
        <CollectionLink section={section} />
      </div>
      <div className="home-favorites-grid">
        {products.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  )
}
function Categories({ section }: { section: CategoriesSection }) {
  const { categories } = useStore()
  return (
    <section className="home-rooms page-width">
      <div className="home-rooms-intro">
        <span className="eyebrow">{section.eyebrow}</span>
        <h2>{section.title}</h2>
        <p>
          Small details.
          <br />A place that feels like you.
        </p>
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
          <img src={section.image} alt="" loading="lazy" width="600" height="520" />
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
  const { config, categories } = useStore()
  return (
    <footer className="site-footer home-footer">
      <div className="page-width">
        <div className="home-footer-invitation">
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h2>{config.footer.text}</h2>
          <Link to="/catalog" className="home-footer-cta" aria-label="Explore the collection">
            <ArrowUpRight size={38} strokeWidth={1} />
          </Link>
        </div>
        <div className="home-footer-links">
          <div>
            <Brand />
            <p>{config.brand.description}</p>
          </div>
          <div>
            <span className="eyebrow">FIND YOUR CORNER</span>
            <nav aria-label="Footer categories">
              {categories.map((category) => (
                <Link key={category.id} to={`/catalog?category=${category.id}`}>
                  {category.name}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <span className="eyebrow">THE FINER DETAILS</span>
            <FooterLinks />
          </div>
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
