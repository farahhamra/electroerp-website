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
  const template = templates[config.template] || templates.electronics
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
    <div className={`storefront template-${config.template}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <template.Header
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
      <template.Footer />
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
