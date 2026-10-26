import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleDot, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { StoreLink } from '../components/Shared'
import { NavigationDropdown } from '../components/NavigationDropdown'
import type { HeaderProps, ProductsSection, CategoriesSection } from './types'
import { selectSectionCategories, selectSectionProducts } from '../core/sections'

export function Brand({
  className = '',
  symbol = false,
}: {
  className?: string
  symbol?: boolean
}) {
  const { config } = useStore()
  return (
    <Link to="/" className={`brand ${className}`} aria-label={`${config.brand.name} home`}>
      {config.brand.logo ? (
        <img src={config.brand.logo} alt={config.brand.name} />
      ) : (
        <>
          {config.brand.showSymbol && symbol && (
            <CircleDot className="brand-symbol" size={28} aria-hidden="true" />
          )}
          {config.brand.name}
        </>
      )}
    </Link>
  )
}
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { config } = useStore()
  return (
    <nav
      id={mobile ? 'mobile-nav' : undefined}
      className={mobile ? 'mobile-nav' : 'template-nav'}
      aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
    >
      {config.navigation.map((link) =>
        link.children?.length ? (
          <NavigationDropdown
            key={link.href}
            label={link.label}
            items={[{ label: 'View all', href: link.href }, ...link.children]}
          />
        ) : (
          <StoreLink key={link.href} href={link.href}>
            {link.label}
            {mobile && <ArrowUpRight size={16} />}
          </StoreLink>
        ),
      )}
    </nav>
  )
}
export function HeaderActions({
  onSearch,
  menuOpen,
  onMenuToggle,
  showSearch = true,
}: HeaderProps & { showSearch?: boolean }) {
  const { count, config } = useStore()
  return (
    <div className="header-actions">
      {showSearch && config.presentation.header.showSearch && (
        <button className="header-search" onClick={onSearch} aria-label="Open search">
          <Search size={20} />
          <span>Search</span>
        </button>
      )}
      <Link to="/cart" className="bag-link" aria-label={`Shopping bag, ${count} items`}>
        <ShoppingBag size={20} />
        <span className="bag-text">Bag</span>
        <span className="bag-count">{count}</span>
      </Link>
      <button
        id="mobile-menu-toggle"
        className="icon-button mobile-menu-button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
        onClick={onMenuToggle}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
    </div>
  )
}
export function FooterLinks() {
  const { config } = useStore()
  return (
    <nav aria-label="Footer navigation">
      {config.footer.links.map((link) => (
        <StoreLink key={link.href} href={link.href}>
          {link.label}
        </StoreLink>
      ))}
    </nav>
  )
}
export function FooterDirectory({
  categoriesTitle,
  linksTitle,
}: {
  categoriesTitle: string
  linksTitle: string
}) {
  const { config, categories } = useStore()
  if (config.footer.columns.length)
    return (
      <>
        {config.footer.columns.map((column) => (
          <div key={column.title}>
            <span className="eyebrow">{column.title}</span>
            <nav aria-label={column.title}>
              {column.links.map((link) => (
                <StoreLink key={link.href} href={link.href}>
                  {link.label}
                </StoreLink>
              ))}
            </nav>
          </div>
        ))}
      </>
    )
  return (
    <>
      {config.presentation.footer.showCategories && (
        <div>
          <span className="eyebrow">{config.footer.categoriesTitle ?? categoriesTitle}</span>
          <nav aria-label="Footer categories">
            {categories.map((category) => (
              <Link key={category.id} to={`/catalog?category=${category.id}`}>
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
      <div>
        <span className="eyebrow">{config.footer.linksTitle ?? linksTitle}</span>
        <FooterLinks />
      </div>
    </>
  )
}
export function FooterCta({
  label,
  href,
  className = 'text-link',
}: {
  label: string
  href: string
  className?: string
}) {
  const { config } = useStore()
  return (
    <StoreLink className={className} href={config.footer.cta?.href ?? href}>
      {config.footer.cta?.label ?? label}
      <ArrowUpRight size={18} />
    </StoreLink>
  )
}
export function FooterLegal() {
  const { config, provider } = useStore()
  return (
    <>
      {config.footer.socialLinks.length > 0 && (
        <nav className="footer-social" aria-label="Social links">
          {config.footer.socialLinks.map((link) => (
            <StoreLink key={link.href} href={link.href}>
              {link.label}
              <ArrowUpRight size={14} />
            </StoreLink>
          ))}
        </nav>
      )}
      <div className="footer-legal">
        <span>
          {config.footer.copyright ?? `© ${new Date().getFullYear()} ${config.brand.name}`}
        </span>
        {config.presentation.footer.showLocale && (
          <span>
            {config.locale.split('-')[0].toUpperCase()} / {config.currency}
          </span>
        )}
        <span>
          {provider.mode === 'mock' ? 'Demo storefront · No real purchases' : config.brand.tagline}
        </span>
      </div>
    </>
  )
}
export function CollectionLink({ section }: { section: ProductsSection }) {
  if (!section.showCta) return null
  const params = new URLSearchParams()
  if (section.collectionId) params.set('collection', section.collectionId)
  if (section.categoryId) params.set('category', section.categoryId)
  const href = section.cta?.href ?? `/catalog${params.size ? `?${params}` : ''}`
  return (
    <StoreLink className="text-link" href={href}>
      {section.cta?.label ?? 'Shop the collection'}
      <ArrowUpRight size={18} />
    </StoreLink>
  )
}
export function useSectionProducts(section: ProductsSection) {
  const { products } = useStore()
  return selectSectionProducts(products, section)
}
export function useSectionCategories(section: CategoriesSection) {
  const { categories } = useStore()
  return selectSectionCategories(categories, section.categoryIds)
}
