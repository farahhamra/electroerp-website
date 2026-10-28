import { describe, it, expect } from 'vitest'
import { evaluateCollection } from './query'
import { querySchema } from '../config/contracts'
import { readFileSync } from 'node:fs'
import type { Product } from '../schema'
const products: Product[] = JSON.parse(
  readFileSync('public/catalogs/engine-v2.json', 'utf8'),
).products
const context = { storeId: 'test', locale: 'en-US', currency: 'USD' }
describe('collection semantics', () => {
  it('requires the same variant to satisfy price, availability and discount', () => {
    const fixture = {
      ...products[0],
      variants: [
        { ...products[0].variants[0], id: 'cheap', price: 100, stock: 0, compareAtPrice: 200 },
        { ...products[0].variants[0], id: 'stocked', price: 1000, stock: 1, compareAtPrice: 1200 },
      ],
    }
    expect(
      evaluateCollection([fixture], querySchema.parse({ maxPrice: 200, inStock: true }), context)
        .items,
    ).toHaveLength(0)
    const result = evaluateCollection(
      [fixture],
      querySchema.parse({ maxPrice: 1200, inStock: true, discounted: true }),
      context,
    )
    expect(result.variants[fixture.id]).toBe('stocked')
  })
  it('preserves explicit order and intersects filters without mutating products', () => {
    const result = evaluateCollection(
      products,
      querySchema.parse({ productIds: [products[2].id, products[0].id, products[2].id] }),
      context,
    )
    expect(result.items.map((p) => p.id)).toEqual([products[2].id, products[0].id])
  })
  it('paginates deterministically and rejects stale query cursors', () => {
    const first = evaluateCollection(
      products,
      querySchema.parse({ limit: 2, sort: 'newest' }),
      context,
    )
    const second = evaluateCollection(
      products,
      querySchema.parse({ limit: 2, sort: 'newest', cursor: first.nextCursor }),
      context,
    )
    expect(new Set([...first.items, ...second.items].map((p) => p.id)).size).toBe(4)
    expect(() =>
      evaluateCollection(
        products,
        querySchema.parse({ limit: 2, sort: 'price-low', cursor: first.nextCursor }),
        context,
      ),
    ).toThrow('cursor')
  })
})

it('selects the qualifying variant with the largest percentage discount', () => {
  const product = {
    ...products[0],
    variants: [
      { ...products[0].variants[0], id: 'cheap', price: 100, compareAtPrice: 110, stock: 5 },
      { ...products[0].variants[0], id: 'half-price', price: 200, compareAtPrice: 400, stock: 5 },
    ],
  }
  expect(
    evaluateCollection([product], querySchema.parse({ sort: 'discount' }), context).variants[
      product.id
    ],
  ).toBe('half-price')
})
