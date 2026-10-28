import { useText } from '../core/i18n/useText'
import { useCollection } from '../hooks/useCollection'
import { useStore } from '../context/StoreContext'
import { ProductCard } from '../components/Shared'
import type { EngineSection, CollectionQuery } from '../core/config/contracts'
function CollectionResults({ result }: { result: ReturnType<typeof useCollection> }) {
  const t = useText()
  const { data, error, loading } = result
  if (loading) return <p role="status">{t('Loading products…')}</p>
  if (error)
    return (
      <p role="alert" className="inline-error">
        {error}
      </p>
    )
  return data?.items.length ? (
    <div className="engine-grid">
      {data.items.map((product) => (
        <div key={product.id}>
          <ProductCard product={product} preferredVariantId={data.variants[product.id]} />
        </div>
      ))}
    </div>
  ) : (
    <p>{t('No products match this selection.')}</p>
  )
}
export function CollectionProducts({ query }: { query: Partial<CollectionQuery> }) {
  return <CollectionResults result={useCollection(query)} />
}
export default function CollectionSection({ section }: { section: EngineSection }) {
  const { config } = useStore()
  const query = {
    ...(section.collectionId ? config.engine!.collections[String(section.collectionId)] : {}),
    ...(section.query as Partial<CollectionQuery> | undefined),
  }
  const result = useCollection(query)
  if (section.empty === 'omit' && !result.loading && !result.error && !result.data?.items.length)
    return null
  return (
    <section className="page-width engine-content">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{String(section.eyebrow ?? '')}</span>
          <h2>{String(section.title ?? '')}</h2>
          {Boolean(section.description) && <p>{String(section.description)}</p>}
        </div>
      </div>
      <CollectionResults result={result} />
    </section>
  )
}
