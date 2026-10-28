/** Sparse template → store → entity composition. Arrays replace rather than concatenate. */
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
function merge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(override)])].map((key) => [
      key,
      object(base[key]) && object(override[key])
        ? merge(base[key], override[key])
        : override[key] === undefined
          ? base[key]
          : override[key],
    ]),
  )
}
const defaults: Record<string, Record<string, unknown>> = {
  electronics: { gallery: 'thumbnails', stickySummary: false },
  fashion: {
    gallery: 'stacked',
    stickySummary: true,
    regions: {
      summary: ['title', 'price', 'variants', 'availability', 'purchase', 'delivery'],
      details: ['description', 'specifications', 'related'],
    },
  },
  home: { gallery: 'rail', stickySummary: false },
  beauty: {
    gallery: 'thumbnails',
    stickySummary: true,
    regions: {
      summary: ['title', 'description', 'price', 'variants', 'availability', 'purchase'],
      details: ['specifications', 'delivery', 'related'],
    },
  },
  outdoor: {
    gallery: 'stacked',
    stickySummary: false,
    regions: {
      summary: ['title', 'price', 'variants', 'availability', 'purchase', 'specifications'],
      details: ['description', 'delivery', 'related'],
    },
  },
}
export function commerceDefaults(input: unknown): unknown {
  if (!object(input) || (input.commerce !== undefined && !object(input.commerce))) return input
  const commerce = (input.commerce ?? {}) as Record<string, unknown>
  const product =
    commerce.product === undefined || object(commerce.product)
      ? merge(defaults[String(input.template)] ?? {}, commerce.product ?? {})
      : commerce.product
  const category = commerce.category ?? {}
  const overrides = (value: unknown, base: unknown) =>
    object(value)
      ? Object.fromEntries(
          Object.entries(value).map(([id, layout]) => [
            id,
            object(base) && object(layout) ? merge(base, layout) : layout,
          ]),
        )
      : value
  return {
    ...input,
    commerce: {
      ...commerce,
      product,
      category,
      ...(commerce.products === undefined
        ? {}
        : { products: overrides(commerce.products, product) }),
      ...(commerce.categories === undefined
        ? {}
        : { categories: overrides(commerce.categories, category) }),
    },
  }
}
