import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { configSchema, productSchema, sectionSchema, type Product } from './schema'
import { selectSectionCategories, selectSectionProducts } from './sections'

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'))
const legacy = read('public/stores/electronics.json')
const catalog = read('public/catalogs/electronics.json')
const products: Product[] = catalog.products.map((p: unknown) => productSchema.parse(p))
const productsSection = (overrides = {}) => {
  const section = sectionSchema.parse({
    id: 'selection',
    type: 'products',
    eyebrow: '',
    title: 'Selected',
    ...overrides,
  })
  if (section.type !== 'products') throw new Error('Wrong fixture')
  return section
}

describe('configuration contract', () => {
  it('loads every original and customized store with a complete configuration', () => {
    for (const name of ['electronics', 'fashion', 'home']) {
      for (const folder of ['', 'examples/']) {
        const config = configSchema.parse(read(`public/stores/${folder}${name}.json`))
        expect(config.template).toBe(name)
        expect(config.presentation.header.showSearch).toBe(true)
        expect(config.sections.every((section) => typeof section.enabled === 'boolean')).toBe(true)
      }
    }
  })
  it('keeps legacy layouts and optional defaults when new settings are absent', () => {
    const config = configSchema.parse(legacy)
    expect(config.presentation.header.sticky).toBe(false)
    expect(config.presentation.productCard.imageRatio).toBe('template')
    expect(config.theme.contentWidth).toBe(1280)
    expect(config.sections[0].style).toEqual({
      tone: 'template',
      width: 'template',
      spacing: 'template',
    })
  })
  it('retains sparse card overrides so unspecified fields inherit the store settings', () => {
    expect(productsSection({ card: { quickAdd: false } }).card).toEqual({ quickAdd: false })
  })
  it('rejects duplicate IDs, unsupported layouts, and unsafe dimensions', () => {
    expect(
      configSchema.safeParse({ ...legacy, sections: [legacy.sections[0], legacy.sections[0]] })
        .success,
    ).toBe(false)
    expect(
      configSchema.safeParse({ ...legacy, theme: { ...legacy.theme, contentWidth: 9000 } }).success,
    ).toBe(false)
    expect(
      sectionSchema.safeParse({ ...legacy.sections[0], layout: 'unimplemented' }).success,
    ).toBe(false)
    expect(
      sectionSchema.safeParse({ ...legacy.sections[0], imagePosition: { x: 200 } }).success,
    ).toBe(false)
    expect(
      sectionSchema.safeParse({
        ...legacy.sections[0],
        secondaryCta: { label: 'Bad', href: 'javascript:alert(1)' },
      }).success,
    ).toBe(false)
  })
  it('keeps the exported editor schema in sync with runtime validation', () => {
    const {
      title: _title,
      description: _description,
      ...exported
    } = read('public/store-config.schema.json')
    expect(exported).toEqual(configSchema.toJSONSchema({ io: 'input' }))
  })
})
describe('merchant selections', () => {
  it('honors curated order, deduplicates and omits missing product IDs', () => {
    const ids = [products[2].id, 'missing', products[0].id, products[2].id]
    expect(
      selectSectionProducts(products, productsSection({ productIds: ids })).map((p) => p.id),
    ).toEqual([products[2].id, products[0].id])
    expect(selectSectionProducts(products, productsSection({ productIds: [] }))).toEqual([])
  })
  it('combines filters, sorts and limits without mutating catalog data', () => {
    const before = products.map((p) => p.id)
    const result = selectSectionProducts(
      products,
      productsSection({ categoryId: 'audio', inStockOnly: true, sort: 'price-low', limit: 2 }),
    )
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Orbit Mini Speaker')
    expect(
      result.every((p) => p.categoryId === 'audio' && p.variants.some((v) => v.stock > 0)),
    ).toBe(true)
    expect(products.map((p) => p.id)).toEqual(before)
  })
  it('curates categories independently of catalog order', () => {
    expect(
      selectSectionCategories(catalog.categories, [
        'workspace',
        'audio',
        'workspace',
        'missing',
      ]).map((c) => c.id),
    ).toEqual(['workspace', 'audio'])
    expect(selectSectionCategories(catalog.categories, [])).toEqual([])
  })
})
