import React, { Suspense, lazy, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './styles.css'
import './components/dropdown.css'
import './templates/templates.css'
import './templates/customization.css'
import { createProvider } from './providers/data'
import { StoreProvider } from './context/StoreContext'
import type { DataProvider, StoreData } from './core/schema'
import { Layout } from './components/Layout'
import { HomePage, templates } from './templates/registry'
import { EmptyState } from './components/Shared'

const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Information = lazy(() => import('./pages/Information'))

function App() {
  const [store, setStore] = useState<{ data: StoreData; provider: DataProvider } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const provider = await createProvider(controller.signal)
        const data = await provider.loadStore(controller.signal)
        if (controller.signal.aborted) return
        const selectedTemplates = [
          data.config.template,
          data.config.presentation.header.template,
          data.config.presentation.footer.template,
          ...data.config.sections.map((section) => section.template),
        ]
        if (selectedTemplates.some((id) => id && !Object.hasOwn(templates, id)))
          throw new Error('Unregistered template in storefront configuration.')
        const theme = data.config.theme
        const root = document.documentElement
        for (const [key, value] of Object.entries({
          background: theme.background,
          foreground: theme.foreground,
          accent: theme.accent,
          'accent-text': theme.accentText,
          surface: theme.surface,
          muted: theme.muted,
          'heading-font': `"${theme.headingFont}", serif`,
          'body-font': `"${theme.bodyFont}", sans-serif`,
          radius: `${theme.radius}px`,
          'content-width': `${theme.contentWidth}px`,
          'body-size': `${theme.bodySize}px`,
          'logo-width': `${data.config.brand.logoWidth}px`,
          ...(theme.headingWeight ? { 'heading-weight': String(theme.headingWeight) } : {}),
        }))
          root.style.setProperty(`--${key}`, value)
        if (theme.headingWeight) root.dataset.headingWeight = String(theme.headingWeight)
        else delete root.dataset.headingWeight
        root.dataset.motion = theme.motion
        root.lang = data.config.locale
        document.title = `${data.config.brand.name} — ${data.config.brand.tagline}`
        document
          .querySelector('meta[name="description"]')
          ?.setAttribute('content', data.config.brand.description)
        setStore({ data, provider })
      } catch {
        if (!controller.signal.aborted)
          setError('We couldn’t load this storefront. Please check your connection and try again.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])
  if (error)
    return (
      <div className="startup-state" role="alert">
        <h1>A little interruption.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    )
  if (!store)
    return (
      <div className="startup-state" role="status">
        <span className="loading-ring" />
        <p>Something good is on its way.</p>
      </div>
    )
  return (
    <StoreProvider data={store.data} provider={store.provider}>
      <HashRouter>
        <Suspense
          fallback={
            <div className="startup-state" role="status">
              Loading…
            </div>
          }
        >
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="products/:slug" element={<Product />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="story" element={<Information />} />
              <Route path="shipping" element={<Information />} />
              <Route path="contact" element={<Information />} />
              <Route
                path="*"
                element={
                  <EmptyState
                    title="A little off the beaten path."
                    text="That page isn’t here. There’s more to discover in the collection."
                  />
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </StoreProvider>
  )
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="startup-state" role="alert">
        <h1>Let’s try that again.</h1>
        <p>The storefront encountered an unexpected error.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload storefront
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
