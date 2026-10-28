import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { validateStoreConfig } from './normalize'
import { installedEngine } from '../../engine/installed'
import { exportV2Schema } from './export'
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const fixture = () => read('public/stores/examples/engine-v2.json')
describe('semantic diagnostics and exported contracts', () => {
  it('keeps v2 schemas and capability metadata aligned with runtime registrations', () => {
    expect(read('public/store-config.v2.schema.json')).toEqual(exportV2Schema(installedEngine))
    expect(read('public/engine-capabilities.json')).toEqual(installedEngine.capabilities())
  })
  it('reports unknown nested settings instead of silently discarding them', () => {
    const input = fixture()
    input.brand.misspelled = true
    expect(validateStoreConfig(input).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'config.unknown_field', pointer: '/brand/misspelled' }),
    )
  })
  it('rejects missing anchors, unknown collection promotions, and invalid purchase layouts', () => {
    const input = fixture()
    input.navigation.push({
      label: 'Missing',
      destination: { kind: 'section', pageId: 'home', sectionId: 'does-not-exist' },
    })
    expect(
      validateStoreConfig(input).diagnostics.some((d) => d.code === 'link.anchor_missing'),
    ).toBe(true)
    input.commerce = {
      product: {
        regions: { media: ['gallery'], summary: ['title', 'price', 'variants'], details: [] },
      },
    }
    expect(
      validateStoreConfig(input).diagnostics.some((d) => d.code === 'commerce.required_block'),
    ).toBe(true)
  })
  it('validates overnight opening hours and invalid exception dates without throwing', () => {
    const input = fixture()
    input.business.locations[0].hours.mon = {
      intervals: [{ start: '22:00', end: '02:00', nextDay: true }],
    }
    input.business.locations[0].hours.tue = { intervals: [{ start: '01:00', end: '09:00' }] }
    input.business.locations[0].exceptions = { '2026-13-31': { closed: true } }
    const result = validateStoreConfig(input)
    expect(result.diagnostics.some((d) => d.code === 'business.hours_overlap')).toBe(true)
    expect(result.diagnostics.some((d) => d.code === 'business.invalid_date')).toBe(true)
  })
  it('normalizes sections before and after category grids and rejects duplicate blocks', () => {
    const input = fixture()
    input.commerce = {
      category: {
        before: [{ id: 'category-intro', type: 'text', title: 'Hello', paragraphs: ['World'] }],
      },
    }
    const result = validateStoreConfig(input)
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
    expect(result.value.engine!.commerce.category.before[0].enabled).toBe(true)
  })
})

it('localizes custom section fields and string array entries in the exported schema', () => {
  const input = fixture()
  input.pages[1].sections.push({
    id: 'notice',
    type: 'demo:notice',
    message: { values: { 'en-US': 'Hello', ar: 'مرحباً' } },
  })
  const result = validateStoreConfig(input, { registry: installedEngine, locale: 'ar' })
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  expect(result.value.engine!.pages[1].sections.at(-1)!.message).toBe('مرحباً')
  const schema = exportV2Schema(installedEngine) as any
  const text = schema.$defs.section.oneOf.find(
    (value: any) => value.properties.type.const === 'text',
  )
  expect(text.properties.paragraphs.items.anyOf[1].properties.values).toBeDefined()
})

it('rejects query strings in page paths and reports commerce errors at original fields', () => {
  const input = fixture()
  input.pages[1].paths['en-US'] = '/story?track=yes'
  expect(validateStoreConfig(input).ok).toBe(false)
  delete input.pages[1].paths['en-US']
  input.pages[1].paths['en-US'] = '/story'
  input.commerce = { category: { before: [{ id: 'bad', type: 'does-not-exist' }] } }
  expect(validateStoreConfig(input).diagnostics).toContainEqual(
    expect.objectContaining({
      pointer: '/commerce/category/before/0/type',
      code: 'section.unknown',
    }),
  )
})

it('rejects unsafe media, traversal and excessive nested columns while keeping text inert', () => {
  const input = fixture()
  input.pages[0].sections[0].image = 'javascript:alert(1)'
  expect(validateStoreConfig(input).diagnostics.some((d) => d.code === 'media.unsafe')).toBe(true)
  const traversal = fixture()
  traversal.pages[1].paths['en-US'] = '/%2e%2e/private'
  expect(validateStoreConfig(traversal).ok).toBe(false)
  const nested = fixture()
  let node: any = {
    id: 'leaf',
    type: 'text',
    title: '<script>alert(1)</script>',
    paragraphs: ['Plain text'],
  }
  for (let depth = 0; depth < 5; depth++)
    node = { id: `columns-${depth}`, type: 'columns', cells: [{ sections: [node] }] }
  nested.pages[1].sections = [node]
  expect(validateStoreConfig(nested).diagnostics.some((d) => d.code === 'section.depth')).toBe(true)
})
