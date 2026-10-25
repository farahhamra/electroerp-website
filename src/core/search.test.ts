import { describe, expect, it } from 'vitest'
import { createProductSearch } from './search'
import type { Product } from './schema'

export const fixture = (
  id: string,
  name: string,
  model: string,
  sku: string,
  brand = 'Sony',
  categoryName = 'Audio',
): Product => ({
  id,
  name,
  model,
  brand,
  categoryName,
  slug: id,
  categoryId: 'audio',
  collectionIds: [],
  description: '',
  details: [],
  images: ['/product.webp'],
  variants: [{ id: 'default', sku, price: 24900, options: {}, stock: 3 }],
})
const catalog = [
  fixture('headphones', 'Wireless Headphones', 'WH-1000XM5', 'SONY-XM5'),
  fixture('speaker', 'Portable Speaker', 'SRS-XB100', 'SONY-XB100'),
  fixture('camera', 'Mirrorless Camera', 'EOS-R6', 'CANON-R6', 'Canon', 'Cameras'),
]
const search = createProductSearch(catalog)
describe('product search relevance', () => {
  it('prioritizes normalized exact model and SKU matches', () => {
    expect(search('wh1000xm5')[0].id).toBe('headphones')
    expect(search('SONY-XM5')[0].id).toBe('headphones')
  })
  it('handles a misspelled product name', () =>
    expect(search('headphnes')[0].id).toBe('headphones'))
  it('matches partial words', () => expect(search('wirel')[0].id).toBe('headphones'))
  it('searches brand and category', () => {
    expect(search('sony')).toHaveLength(2)
    expect(search('cameras')[0].id).toBe('camera')
  })
  it('requires all query terms', () => {
    expect(search('sony headphnes').map((p) => p.id)).toEqual(['headphones'])
    expect(search('sony camera')).toEqual([])
  })
  it('does not confuse a nearby model number', () => expect(search('WH-1000XM4')).toEqual([]))
  it('rejects irrelevant and very short queries', () => {
    expect(search('banana')).toEqual([])
    expect(search('a')).toEqual([])
    expect(search('  ')).toEqual([])
  })
  it('respects the result limit', () => expect(search('sony', 1)).toHaveLength(1))
})
