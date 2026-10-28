import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from '../context/StoreContext'
import { Layout } from '../components/Layout'
import { HomePage } from '../templates/registry'
import { EmptyState } from '../components/Shared'
import { applyTheme } from '../core/theme/apply'
import { HeadManager } from '../core/seo/HeadManager'
import type { StoreData, DataProvider } from '../core/schema'
const EngineApplication = lazy(() => import('./EngineApp'))
const Catalog = lazy(() => import('../pages/Catalog'))
const Product = lazy(() => import('../pages/Product'))
const Cart = lazy(() => import('../pages/Cart'))
const Checkout = lazy(() => import('../pages/Checkout'))
const Information = lazy(() => import('../pages/Information'))
function LegacyApplication({ data, provider }: { data: StoreData; provider: DataProvider }) {
  useEffect(() => {
    applyTheme(data.config)
    document.documentElement.lang = data.config.locale
    document.documentElement.dir = 'ltr'
  }, [data.config])
  return (
    <StoreProvider key={data.config.storeId} data={data} provider={provider}>
      <HashRouter>
        <HeadManager />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="products/:slug" element={<Product />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            {['story', 'shipping', 'contact'].map((path) => (
              <Route key={path} path={path} element={<Information />} />
            ))}
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
      </HashRouter>
    </StoreProvider>
  )
}
export function StorefrontApplication(props: { data: StoreData; provider: DataProvider }) {
  return (
    <Suspense
      fallback={
        <div className="startup-state" role="status">
          Loading…
        </div>
      }
    >
      {props.data.config.engine ? (
        <EngineApplication {...props} />
      ) : (
        <LegacyApplication {...props} />
      )}
    </Suspense>
  )
}
