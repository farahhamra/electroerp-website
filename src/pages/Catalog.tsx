import { useText } from '../core/i18n/useText'
import EngineCatalog from './EngineCatalog'
import { useMemo, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useProductSearch } from '../hooks/useProductSearch'
import { ProductCard } from '../components/Shared'
import { Dropdown } from '../components/Dropdown'

function LegacyCatalog() {
  const t = useText()

  const { products, categories, config } = useStore()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const search = useProductSearch(query)
  const category = params.get('category') || ''
  const brand = params.get('brand') || ''
  const catalog = config.presentation.catalog
  const sort = params.get('sort') || catalog.defaultSort
  const showFilters = Object.values(catalog.filters).some(Boolean)
  const collection = params.get('collection') || ''
  const inStock = params.get('stock') === 'true'
  const maxPrice = params.get('price') || ''
  const update = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  const filtered = useMemo(() => {
    const result = (query ? search.results : products).filter(
      (p) =>
        (!category || p.categoryId === category) &&
        (!brand || p.brand === brand) &&
        (!collection || p.collectionIds.includes(collection)) &&
        (!inStock || p.variants.some((v) => v.stock > 0)) &&
        (!maxPrice ||
          Math.min(...p.variants.map((v) => v.price)) <=
            Number(maxPrice) * 10 ** config.currencyDecimals),
    )
    if (sort === 'price-low')
      result.sort(
        (a, b) =>
          Math.min(...a.variants.map((v) => v.price)) - Math.min(...b.variants.map((v) => v.price)),
      )
    if (sort === 'price-high')
      result.sort(
        (a, b) =>
          Math.min(...b.variants.map((v) => v.price)) - Math.min(...a.variants.map((v) => v.price)),
      )
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [
    query,
    search.results,
    products,
    category,
    brand,
    collection,
    inStock,
    maxPrice,
    config.currencyDecimals,
    sort,
  ])
  const title = query
    ? `Results for “${query}”`
    : categories.find((c) => c.id === category)?.name ||
      (collection === 'new' ? t('New perspectives.') : catalog.title)
  return (
    <div
      className="page-width catalog-page"
      data-catalog-layout={catalog.layout}
      data-catalog-columns={catalog.columns}
      data-has-filters={showFilters}
      style={
        {
          '--catalog-columns': catalog.columns,
          '--catalog-tablet-columns': Math.min(catalog.columns ?? 2, 2),
          '--catalog-mobile-columns': catalog.mobileColumns,
        } as CSSProperties
      }
    >
      <div className="page-intro">
        <span className="eyebrow">{catalog.eyebrow}</span>
        <h1>{title}</h1>
        <p>{catalog.description}</p>
      </div>
      {catalog.showCategoryTabs && (
        <div className="category-tabs" aria-label={t('Product categories')}>
          <button className={!category ? 'selected' : ''} onClick={() => update('category', '')}>
            {t('All products')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'selected' : ''}
              onClick={() => update('category', c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="catalog-toolbar">
        <span role="status">
          {query && search.loading ? 'Searching…' : `${filtered.length} products`}
        </span>
        {!showFilters && params.size > 0 && (
          <button className="text-link" onClick={() => setParams({})}>
            {t('Clear filters')} <X size={15} />
          </button>
        )}
        <div className="catalog-sort">
          <label htmlFor="catalog-sort">{t('Sort by')}</label>
          <Dropdown
            id="catalog-sort"
            label={t('Sort products')}
            value={sort}
            onValueChange={(value) => update('sort', value)}
            options={[
              { value: 'featured', label: t('Featured') },
              { value: 'price-low', label: t('Price: low to high') },
              { value: 'price-high', label: t('Price: high to low') },
              { value: 'name', label: t('Name: A–Z') },
            ]}
          />
        </div>
      </div>
      <div className="catalog-layout">
        {showFilters && (
          <aside>
            <details className="filter-panel" open>
              <summary>
                <SlidersHorizontal size={17} />
                {t('Refine your selection')}
              </summary>
              <div className="filter-fields">
                {catalog.filters.search && (
                  <label>
                    {t('Search collection')}
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => update('q', e.target.value)}
                      placeholder={t('Name, brand, model…')}
                    />
                  </label>
                )}
                {catalog.filters.brand && (
                  <div className="filter-dropdown">
                    <label htmlFor="catalog-brand">{t('Brand')}</label>
                    <Dropdown
                      id="catalog-brand"
                      value={brand}
                      onValueChange={(value) => update('brand', value)}
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
                      step="1"
                      value={maxPrice}
                      onChange={(e) => update('price', e.target.value)}
                      placeholder={t('Any price')}
                    />
                  </label>
                )}
                {catalog.filters.availability && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => update('stock', e.target.checked ? 'true' : '')}
                    />
                    {t('In stock only')}
                  </label>
                )}
                {params.size > 0 && (
                  <button className="text-link" onClick={() => setParams({})}>
                    {t('Clear filters')} <X size={15} />
                  </button>
                )}
              </div>
            </details>
          </aside>
        )}
        <div>
          {query && search.error ? (
            <div className="inline-error" role="alert">
              {search.error}
            </div>
          ) : query && search.loading ? (
            <div className="loading-products" aria-label={t('Loading products')} />
          ) : filtered.length ? (
            <div className="product-grid catalog-grid">
              {filtered.map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h2>{t('Nothing here just yet.')}</h2>
              <p>{t('Try another search or give your filters a little more room.')}</p>
              <button className="button primary" onClick={() => setParams({})}>
                {t('View all products')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Catalog() {
  const { config } = useStore()
  return config.engine ? <EngineCatalog /> : <LegacyCatalog />
}
