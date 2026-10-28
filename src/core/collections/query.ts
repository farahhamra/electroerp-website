import type { Product } from '../schema'
import { querySchema, type CollectionQuery } from '../config/contracts'
export interface QueryContext {
  storeId: string
  locale: string
  currency: string
  revision?: string
}
export interface QueryResult {
  items: Product[]
  nextCursor?: string
  total?: number
  revision?: string
  variants: Record<string, string>
}
export function queryKey(query: CollectionQuery, context: QueryContext) {
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, stable(v)]),
          )
        : value
  return JSON.stringify(stable({ query, context }))
}
function hash(text: string) {
  let n = 2166136261
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619)
  return (n >>> 0).toString(36)
}
export function evaluateCollection(
  products: Product[],
  input: CollectionQuery,
  context: QueryContext,
): QueryResult {
  const query = querySchema.parse(input),
    currencyKey = hash(queryKey({ ...query, cursor: undefined }, context))
  const offset = query.cursor ? Number(query.cursor.split('.')[1]) : 0
  if (
    query.cursor &&
    (!query.cursor.startsWith(currencyKey + '.') || !Number.isSafeInteger(offset) || offset < 0)
  )
    throw new Error('Invalid collection cursor')
  const candidates = query.productIds
    ? [...new Set(query.productIds)].flatMap((id) => products.find((p) => p.id === id) ?? [])
    : products
  const matches = candidates.flatMap((product) => {
    if (
      query.excludeIds?.includes(product.id) ||
      (query.categoryIds?.length && !query.categoryIds.includes(product.categoryId)) ||
      (query.brands?.length && !query.brands.includes(product.brand)) ||
      (query.collectionIds?.length &&
        !query.collectionIds.some((id) => product.collectionIds.includes(id))) ||
      (query.createdAfter && (!product.createdAt || product.createdAt < query.createdAfter))
    )
      return []
    const variants = product.variants.filter(
      (v) =>
        (!query.inStock || v.stock > 0) &&
        (query.minPrice === undefined || v.price >= query.minPrice) &&
        (query.maxPrice === undefined || v.price <= query.maxPrice) &&
        (!query.discounted || (v.compareAtPrice !== undefined && v.compareAtPrice > v.price)),
    )
    if (!variants.length) return []
    let cheapest = [...variants].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0]
    const discount = (v: typeof cheapest) =>
      v.compareAtPrice && v.compareAtPrice > v.price
        ? (v.compareAtPrice - v.price) / v.compareAtPrice
        : 0
    if (query.sort === 'discount')
      cheapest = [...variants].sort(
        (a, b) => discount(b) - discount(a) || a.price - b.price || a.id.localeCompare(b.id),
      )[0]
    const bestDiscount = discount(cheapest)
    return [{ product, variant: cheapest, discount: bestDiscount }]
  })
  if (query.sort !== 'featured')
    matches.sort((a, b) => {
      const by =
        query.sort === 'price-low'
          ? a.variant.price - b.variant.price
          : query.sort === 'price-high'
            ? b.variant.price - a.variant.price
            : query.sort === 'name'
              ? a.product.name.localeCompare(b.product.name, context.locale)
              : query.sort === 'newest'
                ? (b.product.createdAt ?? '').localeCompare(a.product.createdAt ?? '')
                : b.discount - a.discount
      return by || a.product.id.localeCompare(b.product.id)
    })
  const page = matches.slice(offset, offset + query.limit)
  return {
    items: page.map((m) => m.product),
    variants: Object.fromEntries(page.map((m) => [m.product.id, m.variant.id])),
    total: matches.length,
    nextCursor:
      offset + query.limit < matches.length ? `${currencyKey}.${offset + query.limit}` : undefined,
    revision: context.revision,
  }
}
