import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { SearchDialog } from './SearchDialog'
import { templates } from '../templates/registry'

export function Layout() {
  const { config, notice } = useStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const header =
    templates[config.presentation.header.template ?? config.template] || templates.electronics
  const footer =
    templates[config.presentation.footer.template ?? config.template] || templates.electronics
  useEffect(() => {
    setMenuOpen(false)
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      document.getElementById('main')?.focus({ preventScroll: true })
      previousPath.current = location.pathname
    }
  }, [location])
  useEffect(() => {
    if (!menuOpen) return
    const close = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !(event.target instanceof Element && event.target.closest('[role=menu], [role=listbox]'))
      ) {
        setMenuOpen(false)
        document.getElementById('mobile-menu-toggle')?.focus()
      }
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [menuOpen])
  return (
    <div
      className={`storefront template-${config.template}`}
      data-header-density={config.presentation.header.density}
      data-header-sticky={config.presentation.header.sticky}
      data-button-shape={config.theme.buttonShape}
      data-button-style={config.theme.buttonStyle}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header.Header
        onSearch={() => {
          setMenuOpen(false)
          setSearchOpen(true)
        }}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((value) => !value)}
      />
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer.Footer />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className={`toast ${notice ? 'visible' : ''}`} role="status">
        {notice && (
          <>
            <ShoppingBag size={18} />
            {notice}
            <Link to="/cart">
              View bag
              <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
