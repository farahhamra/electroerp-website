import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useProductSearch } from '../hooks/useProductSearch'
import { ProductCard } from '../components/Shared'

export default function Catalog() {
  const { products, categories, config } = useStore()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const search = useProductSearch(query)
  const category = params.get('category') || ''
  const brand = params.get('brand') || ''
  const sort = params.get('sort') || 'featured'
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
      (collection === 'new' ? 'New perspectives.' : 'Find your everyday.')
  return (
    <div className="page-width catalog-page">
      <div className="page-intro">
        <span className="eyebrow">THE COLLECTION</span>
        <h1>{title}</h1>
        <p>A considered selection. A better kind of everyday.</p>
      </div>
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
      <div className="catalog-toolbar">
        <span role="status">
          {query && search.loading ? 'Searching…' : `${filtered.length} products`}
        </span>
        <label>
          Sort by{' '}
          <select
            value={sort}
            onChange={(e) => update('sort', e.target.value)}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="name">Name: A–Z</option>
          </select>
        </label>
      </div>
      <div className="catalog-layout">
        <aside>
          <details className="filter-panel" open>
            <summary>
              <SlidersHorizontal size={17} />
              Refine your selection
            </summary>
            <div className="filter-fields">
              <label>
                Search collection
                <input
                  type="search"
                  value={query}
                  onChange={(e) => update('q', e.target.value)}
                  placeholder="Name, brand, model…"
                />
              </label>
              <label>
                Brand
                <select value={brand} onChange={(e) => update('brand', e.target.value)}>
                  <option value="">All brands</option>
                  {[...new Set(products.map((p) => p.brand))].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
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
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => update('stock', e.target.checked ? 'true' : '')}
                />
                In stock only
              </label>
              {params.size > 0 && (
                <button className="text-link" onClick={() => setParams({})}>
                  Clear filters <X size={15} />
                </button>
              )}
            </div>
          </details>
        </aside>
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
