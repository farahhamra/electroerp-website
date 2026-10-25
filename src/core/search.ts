import Fuse from 'fuse.js'
import type { Product } from './schema'

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
const compact = (value: string) => normalize(value).replace(/[^a-z0-9]/g, '')

/** Build once per catalog version; intersect token results to avoid unrelated matches. */
export function createProductSearch(products: Product[]) {
  const fuse = new Fuse(products, {
    keys: [
      { name: 'variants.sku', weight: 0.28 },
      { name: 'model', weight: 0.24 },
      { name: 'name', weight: 0.26 },
      { name: 'brand', weight: 0.14 },
      { name: 'categoryName', weight: 0.08 },
    ],
    threshold: 0.28,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
    shouldSort: true,
  })
  return (rawQuery: string, limit = 24): Product[] => {
    const query = normalize(rawQuery.trim()).slice(0, 160)
    if (query.length < 2) return []
    const terms = query.split(/\s+/).filter(Boolean)
    const tokenResults = terms.map(
      (term) => new Map(fuse.search(term).map((r) => [r.item.id, r.score ?? 1])),
    )
    return products
      .flatMap((product) => {
        const identifiers = [product.model, ...product.variants.map((v) => v.sku)].map(compact)
        const exactCode = identifiers.includes(compact(query))
        if (exactCode) return [{ product, rank: -2 }]
        let score = 0
        for (const [index, term] of terms.entries()) {
          // Codes with digits must match literally; don't silently substitute another model.
          if (/\d/.test(term)) {
            if (
              !identifiers.some((code) => code.includes(compact(term))) &&
              !compact(product.name).includes(compact(term))
            )
              return []
          } else if (!tokenResults[index].has(product.id)) return []
          score += tokenResults[index].get(product.id) ?? 0
        }
        const exactName = normalize(product.name) === query
        const namePrefix = normalize(product.name).startsWith(query)
        return [{ product, rank: exactName ? -1 : namePrefix ? -0.5 : score / terms.length }]
      })
      .sort((a, b) => a.rank - b.rank || a.product.name.localeCompare(b.product.name))
      .slice(0, limit)
      .map((result) => result.product)
  }
}
