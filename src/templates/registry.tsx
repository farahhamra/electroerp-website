import type { ComponentType } from 'react'
import { ArrowRight, ArrowUpRight, Sparkles, PackageCheck, HeartHandshake } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import type { Section } from '../core/schema'
import { ProductCard, StoreLink } from '../components/Shared'
import { Link } from 'react-router-dom'

type HeroSection = Extract<Section, { type: 'hero' }>
function ElectronicsHero({ section }: { section: HeroSection }) {
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
function FashionHero({ section }: { section: HeroSection }) {
  return (
    <section className="hero hero-fashion page-width">
      <div className="hero-art">
        <img
          src={section.image}
          alt={section.imageAlt}
          width="600"
          height="520"
          fetchPriority="high"
        />
        <span className="hero-art-label">THE CONSIDERED COLLECTION — VOL. 01</span>
      </div>
      <div className="hero-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
        <StoreLink className="button primary" href={section.cta.href}>
          {section.cta.label}
          <ArrowUpRight size={18} />
        </StoreLink>
      </div>
    </section>
  )
}
function HomeHero({ section }: { section: HeroSection }) {
  return (
    <section className="hero hero-home page-width">
      <div className="hero-copy">
        <span className="eyebrow">{section.eyebrow}</span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
        <StoreLink className="button primary" href={section.cta.href}>
          {section.cta.label}
          <ArrowUpRight size={18} />
        </StoreLink>
        <p className="hero-signature">Good things take their time.</p>
      </div>
      <div className="hero-art">
        <img
          src={section.image}
          alt={section.imageAlt}
          width="600"
          height="520"
          fetchPriority="high"
        />
      </div>
    </section>
  )
}

export const templates: Record<string, { Hero: ComponentType<{ section: HeroSection }> }> = {
  electronics: { Hero: ElectronicsHero },
  fashion: { Hero: FashionHero },
  home: { Hero: HomeHero },
}
export function HomePage() {
  const { config, products, categories } = useStore()
  const template = templates[config.template]
  if (!template)
    return (
      <div className="empty-state">
        <h1>Template unavailable</h1>
        <p>This storefront configuration references an unregistered template.</p>
      </div>
    )
  const benefitIcons = [Sparkles, PackageCheck, HeartHandshake]
  return (
    <>
      {config.sections.map((section) => {
        switch (section.type) {
          case 'hero':
            return <template.Hero key={section.id} section={section} />
          case 'products':
            return (
              <section className="section page-width" key={section.id}>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{section.eyebrow}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <Link
                    className="text-link"
                    to={
                      section.collectionId
                        ? `/catalog?collection=${section.collectionId}`
                        : '/catalog'
                    }
                  >
                    Shop the collection <ArrowUpRight size={18} />
                  </Link>
                </div>
                <div className="product-grid">
                  {products
                    .filter(
                      (p) =>
                        !section.collectionId || p.collectionIds.includes(section.collectionId),
                    )
                    .slice(0, section.limit)
                    .map((p) => (
                      <ProductCard product={p} key={p.id} />
                    ))}
                </div>
              </section>
            )
          case 'categories':
            return (
              <section className="categories-section section page-width" key={section.id}>
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">{section.eyebrow}</span>
                    <h2>{section.title}</h2>
                  </div>
                  <span className="section-aside">Thoughtfully chosen. Just for you.</span>
                </div>
                <div className="category-grid">
                  {categories.map((category) => (
                    <Link
                      to={`/catalog?category=${category.id}`}
                      className="category-card"
                      key={category.id}
                    >
                      <img src={category.image} alt="" loading="lazy" width="600" height="520" />
                      <div>
                        <h3>{category.name}</h3>
                        <p>{category.description}</p>
                      </div>
                      <ArrowUpRight size={22} />
                    </Link>
                  ))}
                </div>
              </section>
            )
          case 'banner':
            return (
              <section className="editorial-banner page-width" key={section.id}>
                <div className="banner-copy">
                  <span className="eyebrow">{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                  <StoreLink className="button light" href={section.cta.href}>
                    {section.cta.label}
                    <ArrowRight size={18} />
                  </StoreLink>
                </div>
                {section.image && (
                  <img src={section.image} alt="" loading="lazy" width="600" height="520" />
                )}
              </section>
            )
        }
      })}
      <section className="benefits page-width" aria-label="Shopping with us">
        {config.benefits.map((benefit, index) => {
          const Icon = benefitIcons[index % benefitIcons.length]
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
    </>
  )
}
