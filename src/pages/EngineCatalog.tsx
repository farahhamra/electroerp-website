import { useText } from '../core/i18n/useText'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useCollection } from '../hooks/useCollection'
import { useProductSearch } from '../hooks/useProductSearch'
import { Dropdown } from '../components/Dropdown'
import { ProductCard, EmptyState } from '../components/Shared'
import { SectionRenderer } from '../engine/SectionRenderer'
import type { CollectionQuery, EngineSection } from '../core/config/contracts'
export default function EngineCatalog() {
  const t = useText()

  const { config, products, categories, registerProduct, registerCategory, provider } = useStore(),
    { categorySlug } = useParams(),
    [params, setParams] = useSearchParams()
  const category = categorySlug
    ? categories.find((c) => (c.slug ?? c.id) === categorySlug)
    : undefined
  const [categoryResolved, setCategoryResolved] = useState('')
  useEffect(() => {
    if (!categorySlug || category || !provider.getCategory) return
    const controller = new AbortController()
    provider
      .getCategory(categorySlug, controller.signal, {
        storeId: config.storeId,
        locale: config.locale,
        currency: config.currency,
      })
      .then((value) => {
        if (controller.signal.aborted) return
        if (value) registerCategory(value)
        setCategoryResolved(categorySlug)
      })
      .catch(() => {
        if (!controller.signal.aborted) setCategoryResolved(categorySlug)
      })
    return () => controller.abort()
  }, [categorySlug, category, provider, config.locale, registerCategory])
  const settings = category
    ? (config.engine!.commerce.categories[category.id] ?? config.engine!.commerce.category)
    : undefined
  const filterKey = params.toString() + config.locale + category?.id
  const [pagination, setPagination] = useState<{ key: string; cursor?: string }>({ key: '' })
  const cursor = pagination.key === filterKey ? pagination.cursor : undefined
  const setCursor = (cursor: string | undefined) => setPagination({ key: filterKey, cursor })
  const search = useProductSearch(params.get('q') ?? '')
  const query = useMemo<Partial<CollectionQuery>>(
    () => ({
      ...settings?.query,
      ...(params.get('collection')
        ? (config.engine!.collections[params.get('collection')!] ?? {
            collectionIds: [params.get('collection')!],
          })
        : {}),
      categoryIds: category
        ? [category.id]
        : params.get('category')
          ? [params.get('category')!]
          : settings?.query?.categoryIds,
      brands: params.get('brand') ? [params.get('brand')!] : undefined,
      maxPrice:
        params.get('price') && Number.isFinite(Number(params.get('price')))
          ? Math.max(0, Math.round(Number(params.get('price')) * 10 ** config.currencyDecimals))
          : undefined,
      inStock: params.get('stock') === 'true' || undefined,
      discounted: params.get('discount') === 'true' || undefined,
      ...(params.get('q') ? { productIds: search.results.map((p) => p.id) } : {}),
      sort: ((['featured', 'price-low', 'price-high', 'name', 'newest', 'discount'].includes(
        params.get('sort') ?? '',
      )
        ? params.get('sort')
        : undefined) ??
        settings?.query?.sort ??
        config.presentation.catalog.defaultSort) as CollectionQuery['sort'],
      limit: 12,
      cursor,
    }),
    [params.toString(), settings, category, search.results, cursor],
  )
  const result = useCollection(query)

  useEffect(() => {
    result.data?.items
      .filter((p) => !products.some((existing) => existing.id === p.id))
      .forEach(registerProduct)
  }, [result.data, registerProduct])
  const update = (key: string, value: string) => {
    setCursor(undefined)
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }
  if (categorySlug && !category && provider.getCategory && categoryResolved !== categorySlug)
    return (
      <p className="startup-state" role="status">
        {t('Loading…')}
      </p>
    )
  if (categorySlug && !category)
    return (
      <EmptyState
        title={t('Collection unavailable')}
        text={t('This collection could not be found.')}
      />
    )
  const catalog = config.presentation.catalog
  return (
    <>
      {settings?.before.map((s, i) => (
        <SectionRenderer section={s as EngineSection} key={i} />
      ))}
      <div className="page-width catalog-page" data-catalog-layout={catalog.layout}>
        <div className="page-intro">
          <span className="eyebrow">{catalog.eyebrow}</span>
          <h1>{category?.name ?? catalog.title}</h1>
          <p>{category?.description ?? catalog.description}</p>
          {settings?.showImage && category?.image && (
            <img className="category-cover" src={category.image} alt="" width="1200" height="450" />
          )}
        </div>
        {catalog.showCategoryTabs && !categorySlug && (
          <div className="category-tabs">
            <button
              className={!params.get('category') ? 'selected' : ''}
              onClick={() => update('category', '')}
            >
              {t('All products')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className={params.get('category') === c.id ? 'selected' : ''}
                onClick={() => update('category', c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="engine-catalog-controls">
          {catalog.filters.search && (
            <label>
              {t('Search')}
              <input
                type="search"
                value={params.get('q') ?? ''}
                onChange={(e) => update('q', e.target.value)}
              />
            </label>
          )}
          {catalog.filters.brand && (
            <div>
              <label htmlFor="engine-brand">{t('Brand')}</label>
              <Dropdown
                id="engine-brand"
                value={params.get('brand') ?? ''}
                onValueChange={(v) => update('brand', v)}
                options={[
                  { value: '', label: t('All brands') },
                  ...[...new Set(products.map((p) => p.brand))].map((value) => ({
                    value,
                    label: value,
                  })),
                ]}
              />
            </div>
          )}
          {catalog.filters.price && (
            <label>
              {t('Maximum price (')}
              {config.currency})
              <input
                type="number"
                min="0"
                value={params.get('price') ?? ''}
                onChange={(e) => update('price', e.target.value)}
              />
            </label>
          )}
          <div>
            <label htmlFor="engine-sort">{t('Sort by')}</label>
            <Dropdown
              id="engine-sort"
              value={query.sort!}
              onValueChange={(v) => update('sort', v)}
              options={[
                { value: 'featured', label: t('Featured') },
                { value: 'price-low', label: t('Price: low to high') },
                { value: 'price-high', label: t('Price: high to low') },
                { value: 'name', label: t('Name: A–Z') },
                { value: 'newest', label: t('Newest') },
                { value: 'discount', label: t('Largest discount') },
              ]}
            />
          </div>
          {catalog.filters.availability && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={params.get('stock') === 'true'}
                onChange={(e) => update('stock', e.target.checked ? 'true' : '')}
              />
              {t('In stock only')}
            </label>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={params.get('discount') === 'true'}
              onChange={(e) => update('discount', e.target.checked ? 'true' : '')}
            />
            {t('On sale')}
          </label>
        </div>
        {result.error || search.error ? (
          <div role="alert" className="inline-error">
            {result.error ?? search.error}
          </div>
        ) : result.loading || (search.loading && !!params.get('q')) ? (
          <p role="status">{t('Loading products…')}</p>
        ) : (
          <>
            <p role="status">
              {result.data?.total === undefined
                ? ''
                : t('products.count', { count: result.data.total })}
            </p>
            <div
              className="engine-grid engine-catalog-grid"
              style={
                {
                  '--catalog-columns': settings?.columns ?? catalog.columns ?? 3,
                  '--catalog-mobile-columns': catalog.mobileColumns,
                } as React.CSSProperties
              }
            >
              {result.data?.items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  preferredVariantId={result.data?.variants[p.id]}
                />
              ))}
            </div>
            {!result.data?.items.length && (
              <div className="no-results">
                <h2>{t('Nothing here just yet.')}</h2>
                <button
                  className="button"
                  onClick={() => {
                    setCursor(undefined)
                    setParams({})
                  }}
                >
                  {t('Clear filters')}
                </button>
              </div>
            )}
            <div className="pagination">
              {cursor && (
                <button className="button" onClick={() => setCursor(undefined)}>
                  {t('First page')}
                </button>
              )}
              {result.data?.nextCursor && (
                <button
                  className="button primary"
                  onClick={() => setCursor(result.data!.nextCursor)}
                >
                  {t('Next page')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {settings?.after.map((s, i) => (
        <SectionRenderer section={s as EngineSection} key={i} />
      ))}
    </>
  )
}
