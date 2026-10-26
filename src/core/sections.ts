import type { Category, Product, Section } from './schema'

type ProductsSection = Extract<Section, { type: 'products' }>
export function selectSectionProducts(products: Product[], section: ProductsSection) {
  // An explicit ID list is an ordered curation; missing IDs are safely omitted.
  const candidates = section.productIds
    ? [...new Set(section.productIds)].flatMap((id) => products.find((p) => p.id === id) ?? [])
    : products
  const selected = candidates.filter(
    (p) =>
      (!section.collectionId || p.collectionIds.includes(section.collectionId)) &&
      (!section.categoryId || p.categoryId === section.categoryId) &&
      (!section.inStockOnly || p.variants.some((v) => v.stock > 0)),
  )
  const price = (p: Product) => Math.min(...p.variants.map((v) => v.price))
  if (section.sort === 'price-low') selected.sort((a, b) => price(a) - price(b))
  if (section.sort === 'price-high') selected.sort((a, b) => price(b) - price(a))
  if (section.sort === 'name') selected.sort((a, b) => a.name.localeCompare(b.name))
  return selected.slice(0, section.limit)
}
export function selectSectionCategories(categories: Category[], ids?: string[]) {
  return ids
    ? [...new Set(ids)].flatMap((id) => categories.find((c) => c.id === id) ?? [])
    : categories
}
