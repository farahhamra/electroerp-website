import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleDot, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { StoreLink } from '../components/Shared'
import { NavigationDropdown } from '../components/NavigationDropdown'
import type { HeaderProps, ProductsSection } from './types'

export function Brand({ className = '' }: { className?: string }) {
  const { config } = useStore()
  return (
    <Link to="/" className={`brand ${className}`} aria-label={`${config.brand.name} home`}>
      {config.brand.logo ? (
        <img src={config.brand.logo} alt={config.brand.name} />
      ) : (
        <>
          {config.template === 'electronics' && (
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
  const { count } = useStore()
  return (
    <div className="header-actions">
      {showSearch && (
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
export function FooterLegal() {
  const { config, provider } = useStore()
  return (
    <div className="footer-legal">
      <span>
        © {new Date().getFullYear()} {config.brand.name}
      </span>
      <span>
        {config.locale.split('-')[0].toUpperCase()} / {config.currency}
      </span>
      <span>
        {provider.mode === 'mock' ? 'Demo storefront · No real purchases' : config.brand.tagline}
      </span>
    </div>
  )
}
export function CollectionLink({ section }: { section: ProductsSection }) {
  return (
    <Link
      className="text-link"
      to={section.collectionId ? `/catalog?collection=${section.collectionId}` : '/catalog'}
    >
      Shop the collection
      <ArrowUpRight size={18} />
    </Link>
  )
}
export function useSectionProducts(section: ProductsSection) {
  const { products } = useStore()
  return products
    .filter((p) => !section.collectionId || p.collectionIds.includes(section.collectionId))
    .slice(0, section.limit)
}
