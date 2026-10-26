import { useMemo, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useProductSearch } from '../hooks/useProductSearch'
import { ProductCard } from '../components/Shared'
import { Dropdown } from '../components/Dropdown'

export default function Catalog() {
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
      (collection === 'new' ? 'New perspectives.' : catalog.title)
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
        <div className="category-tabs" aria-label="Product categories">
          <button className={!category ? 'selected' : ''} onClick={() => update('category', '')}>
            All products
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
            Clear filters <X size={15} />
          </button>
        )}
        <div className="catalog-sort">
          <label htmlFor="catalog-sort">Sort by</label>
          <Dropdown
            id="catalog-sort"
            label="Sort products"
            value={sort}
            onValueChange={(value) => update('sort', value)}
            options={[
              { value: 'featured', label: 'Featured' },
              { value: 'price-low', label: 'Price: low to high' },
              { value: 'price-high', label: 'Price: high to low' },
              { value: 'name', label: 'Name: A–Z' },
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
                Refine your selection
              </summary>
              <div className="filter-fields">
                {catalog.filters.search && (
                  <label>
                    Search collection
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => update('q', e.target.value)}
                      placeholder="Name, brand, model…"
                    />
                  </label>
                )}
                {catalog.filters.brand && (
                  <div className="filter-dropdown">
                    <label htmlFor="catalog-brand">Brand</label>
                    <Dropdown
                      id="catalog-brand"
                      value={brand}
                      onValueChange={(value) => update('brand', value)}
                      options={[
                        { value: '', label: 'All brands' },
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
                    Maximum price ({config.currency})
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={maxPrice}
                      onChange={(e) => update('price', e.target.value)}
                      placeholder="Any price"
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
                    In stock only
                  </label>
                )}
                {params.size > 0 && (
                  <button className="text-link" onClick={() => setParams({})}>
                    Clear filters <X size={15} />
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
            <div className="loading-products" aria-label="Loading products" />
          ) : filtered.length ? (
            <div className="product-grid catalog-grid">
              {filtered.map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h2>Nothing here just yet.</h2>
              <p>Try another search or give your filters a little more room.</p>
              <button className="button primary" onClick={() => setParams({})}>
                View all products
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
