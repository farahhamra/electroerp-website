import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Menu, Search, ShoppingBag, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { SearchDialog } from './SearchDialog'
import { StoreLink } from './Shared'

export function Layout() {
  const { config, count, notice, provider } = useStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  useEffect(() => {
    setMenuOpen(false)
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      document.getElementById('main')?.focus({ preventScroll: true })
      previousPath.current = location.pathname
    }
  }, [location])
  return (
    <div className={`storefront template-${config.template}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {config.announcement && (
        <div className="announcement">
          <span>{config.announcement}</span>
          <ArrowRight size={14} aria-hidden="true" />
        </div>
      )}
      <header className="site-header">
        <div className="header-inner page-width">
          <Link to="/" className="brand" aria-label={`${config.brand.name} home`}>
            {config.brand.logo ? (
              <img src={config.brand.logo} alt={config.brand.name} />
            ) : (
              <>
                <span className="brand-symbol" aria-hidden="true">
                  ◉
                </span>
                {config.brand.name}
                <span className="brand-period">®</span>
              </>
            )}
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {config.navigation.map((link) => (
              <StoreLink key={link.href} href={link.href}>
                {link.label}
              </StoreLink>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="header-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search size={20} />
              <span>Search</span>
            </button>
            <span className="header-divider" />
            <Link to="/cart" className="bag-link" aria-label={`Shopping bag, ${count} items`}>
              <ShoppingBag size={20} />
              <span className="bag-text">Bag</span>
              <span className="bag-count">{count}</span>
            </Link>
            <button
              className="icon-button mobile-menu-button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation">
            {config.navigation.map((link) => (
              <StoreLink key={link.href} href={link.href}>
                {link.label}
                <ArrowUpRight size={18} />
              </StoreLink>
            ))}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="page-width footer-main">
          <div>
            <Link className="brand" to="/">
              {config.brand.name}
              <span className="brand-period">®</span>
            </Link>
            <p>{config.brand.description}</p>
          </div>
          <div className="footer-invitation">
            <span className="eyebrow">A LITTLE CLOSER</span>
            <p>{config.footer.text}</p>
            <Link className="text-link" to="/contact">
              Let’s talk <ArrowUpRight size={17} />
            </Link>
          </div>
          <nav aria-label="Footer navigation">
            {config.footer.links.map((link) => (
              <StoreLink href={link.href} key={link.href}>
                {link.label}
              </StoreLink>
            ))}
          </nav>
        </div>
        <div className="page-width footer-bottom">
          <span>
            © {new Date().getFullYear()} {config.brand.name}
          </span>
          <span>
            {config.locale.split('-')[0].toUpperCase()} / {config.currency}
          </span>
          <span>
            {provider.mode === 'mock'
              ? 'Demo storefront · No real purchases'
              : config.brand.tagline}
          </span>
        </div>
      </footer>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className={`toast ${notice ? 'visible' : ''}`} role="status">
        {notice && (
          <>
            <ShoppingBag size={18} />
            {notice}
            <Link to="/cart">
              View bag <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
