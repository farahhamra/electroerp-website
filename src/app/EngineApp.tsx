import '../core/i18n/runtime'
import { useText } from '../core/i18n/useText'
import { Suspense, lazy, useMemo, useEffect, useState } from 'react'
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { StoreProvider, useStore } from '../context/StoreContext'
import type { StoreData, DataProvider } from '../core/schema'
import { Layout } from '../components/Layout'
import { HomePage } from '../templates/registry'
import { EmptyState } from '../components/Shared'
import { PageRenderer } from '../engine/PageRenderer'
import { installedEngine } from '../engine/installed'
import { EngineProvider } from '../engine/Context'
import { routeLocale, pagePath, localePath, stripLocale } from '../core/routing/links'
import { normalizeStoreConfig } from '../core/config/normalize'
import { HeadManager } from '../core/seo/HeadManager'
import { applyTheme } from '../core/theme/apply'
import { tokenCSS } from '../core/theme/styles'
const Catalog = lazy(() => import('../pages/Catalog'))
const Category = lazy(() => import('../pages/EngineCatalog'))
const Product = lazy(() => import('../pages/Product'))
const Cart = lazy(() => import('../pages/Cart'))
const Checkout = lazy(() => import('../pages/Checkout'))
const Information = lazy(() => import('../pages/Information'))
function Loading() {
  const t = useText()
  return (
    <div className="startup-state" role="status">
      {t('Loading…')}
    </div>
  )
}
function NotFound() {
  const t = useText()
  return (
    <EmptyState
      title={t('A little off the beaten path.')}
      text={t('That page isn’t here. There’s more to discover in the collection.')}
    />
  )
}
function LocaleSwitch({ data }: { data: StoreData }) {
  const location = useLocation(),
    navigate = useNavigate(),
    engine = data.config.engine!
  const { products, categories, t } = useStore(),
    [notice, setNotice] = useState('')
  if (engine.i18n.locales.length < 2) return null
  const current = engine.i18n.locales.find((l) => l.code === data.config.locale)!
  const page = engine.pages.find(
    (p) =>
      p.enabled &&
      pagePath(p, engine, data.config.locale).replace(/\/$/, '') ===
        location.pathname.replace(/\/$/, ''),
  )
  const path = stripLocale(location.pathname, engine)
  const product = path.startsWith('/products/')
    ? products.find((p) => p.slug === decodeURIComponent(path.slice(10)))
    : undefined
  const category = path.startsWith('/categories/')
    ? categories.find((c) => (c.slug ?? c.id) === decodeURIComponent(path.slice(12)))
    : undefined
  const switchTo = (locale: string) => {
    let target: string | undefined
    if (page) target = pagePath(page, engine, locale)
    else if (product) {
      const raw = data.products.find((p) => p.id === product.id) ?? product
      if (locale === engine.i18n.defaultLocale || raw.translations?.[locale])
        target = localePath(
          '/products/' + encodeURIComponent(raw.translations?.[locale]?.slug ?? raw.slug),
          engine,
          locale,
        )
    } else if (category) {
      const raw = data.categories.find((c) => c.id === category.id) ?? category
      if (locale === engine.i18n.defaultLocale || raw.translations?.[locale])
        target = localePath(
          '/categories/' +
            encodeURIComponent(raw.translations?.[locale]?.slug ?? raw.slug ?? raw.id),
          engine,
          locale,
        )
    } else if (['/catalog', '/cart', '/checkout'].includes(path))
      target = localePath(path, engine, locale)
    setNotice(target ? '' : t('This page is unavailable in that language. Showing the homepage.'))
    navigate((target ?? localePath('/', engine, locale)) + (target ? location.search : ''))
  }
  return (
    <div className="locale-switch">
      <details>
        <summary>{current.label}</summary>
        <nav aria-label={t('Language')}>
          {engine.i18n.locales.map((locale) => (
            <button
              key={locale.code}
              lang={locale.code}
              aria-current={locale.code === current.code ? 'true' : undefined}
              onClick={(event) => {
                switchTo(locale.code)
                event.currentTarget.closest('details')?.removeAttribute('open')
              }}
            >
              {locale.label}
            </button>
          ))}
        </nav>
      </details>
      <span className="sr-only" role="status">
        {notice}
      </span>
    </div>
  )
}
export function ApplicationContent({
  data,
  provider,
}: {
  data: StoreData
  provider: DataProvider
}) {
  const location = useLocation()
  const locale = data.config.engine
    ? routeLocale(location.pathname, data.config.engine)
    : data.config.locale
  const resolved = useMemo(() => {
    if (!data.config.engine) return data
    const products = data.products.map((p) => ({ ...p, ...p.translations?.[locale] })),
      categories = data.categories.map((c) => ({ ...c, ...c.translations?.[locale] }))
    return {
      ...data,
      products: data.products,
      categories,
      config: normalizeStoreConfig(data.config.engine.source, {
        locale,
        products,
        categories,
        mode: provider.mode,
        registry: installedEngine,
        catalogCoverage: provider.capabilities?.catalog,
      }),
    }
  }, [data, locale, provider.mode])
  const engine = resolved.config.engine
  const currentPage = engine?.pages.find(
    (p) => pagePath(p, engine, locale).replace(/\/$/, '') === location.pathname.replace(/\/$/, ''),
  )
  useEffect(() => {
    applyTheme(resolved.config)
    document.documentElement.lang = locale
    document.documentElement.dir =
      engine?.i18n.locales.find((l) => l.code === locale)?.direction ?? 'ltr'
  }, [locale, engine])
  const prefixes = engine
    ? [
        '',
        ...engine.i18n.locales
          .filter((l) => l.code !== engine.i18n.defaultLocale)
          .map((l) => l.code + '/'),
      ]
    : ['']
  return (
    <EngineProvider engine={installedEngine}>
      <StoreProvider key={resolved.config.storeId} data={resolved} provider={provider}>
        <HeadManager />
        <style>{`:root{${installedEngine
          .fonts()
          .map((font) => `--font-${font.id}:${JSON.stringify(font.family)},${font.fallback}`)
          .join(';')}}`}</style>
        {engine?.theme.tokens && <style>{tokenCSS(engine.theme.tokens, ':root')}</style>}
        {currentPage?.design?.tokens && (
          <style>{tokenCSS(currentPage.design.tokens, ':root')}</style>
        )}
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              {engine ? (
                engine.pages
                  .filter((p) => p.enabled)
                  .map((p) => (
                    <Route
                      key={p.id}
                      path={pagePath(p, engine, locale)}
                      element={<PageRenderer page={p} />}
                    />
                  ))
              ) : (
                <Route index element={<HomePage />} />
              )}
              {prefixes.flatMap((prefix) => [
                <Route
                  key={prefix + 'category'}
                  path={prefix + 'categories/:categorySlug'}
                  element={<Category />}
                />,
                <Route key={prefix + 'catalog'} path={prefix + 'catalog'} element={<Catalog />} />,
                <Route
                  key={prefix + 'product'}
                  path={prefix + 'products/:slug'}
                  element={<Product />}
                />,
                <Route key={prefix + 'cart'} path={prefix + 'cart'} element={<Cart />} />,
                <Route
                  key={prefix + 'checkout'}
                  path={prefix + 'checkout'}
                  element={<Checkout />}
                />,
              ])}
              {!engine &&
                ['story', 'shipping', 'contact'].map((path) => (
                  <Route key={path} path={path} element={<Information />} />
                ))}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        {engine && <LocaleSwitch data={resolved} />}
      </StoreProvider>
    </EngineProvider>
  )
}
export default function EngineApplication({
  data,
  provider,
}: {
  data: StoreData
  provider: DataProvider
}) {
  const Router = data.config.engine?.routing.mode === 'history' ? BrowserRouter : HashRouter
  const basename =
    data.config.engine?.routing.mode === 'history' ? data.config.engine.routing.basePath : '/'
  return (
    <Router basename={basename}>
      <ApplicationContent data={data} provider={provider} />
    </Router>
  )
}
