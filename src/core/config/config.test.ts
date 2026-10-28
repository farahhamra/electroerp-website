import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { validateStoreConfig, migrateV1, normalizeStoreConfig } from './normalize'
import { createStorefrontEngine } from '../../engine/registry'
import { resolveResponsive } from '../theme/styles'
import { resolveDestination } from '../routing/links'
import { diagnostic } from './diagnostics'
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const original = read('public/stores/electronics.json')
const catalog = read('public/catalogs/electronics.json')
const migrated = () => JSON.parse(JSON.stringify(migrateV1(original)))
describe('versioned storefront configuration', () => {
  it('keeps all v1 native and customized stores valid and migrates them without losing pages', () => {
    for (const name of ['electronics', 'fashion', 'home', 'beauty', 'outdoor'])
      for (const path of ['', 'examples/']) {
        const input = read(`public/stores/${path}${name}.json`)
        expect(validateStoreConfig(input).ok).toBe(true)
        const result = validateStoreConfig(JSON.parse(JSON.stringify(migrateV1(input))))
        if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
        expect(result.value.engine?.pages.map((p) => p.id)).toEqual([
          'home',
          'story',
          'shipping',
          'contact',
        ])
        expect(result.value.theme).toEqual(normalizeStoreConfig(input).theme)
      }
  })
  it('rejects future versions and reports source pointers including escaped keys', () => {
    expect(validateStoreConfig({ ...original, version: 99 }).diagnostics[0].code).toBe(
      'config.version',
    )
    expect(diagnostic('x', ['a/b', '~', 2], 'bad').pointer).toBe('/a~1b/~0/2')
  })
  it('detects duplicate routes, unsupported sections and illegal nesting', () => {
    const input = migrated()
    input.pages[1].paths['en-US'] = '/'
    expect(
      validateStoreConfig(input).diagnostics.some((d) => d.code === 'page.route_collision'),
    ).toBe(true)
    input.pages[1].sections = [{ id: 'bad', type: 'missing' }]
    expect(validateStoreConfig(input).diagnostics.some((d) => d.code === 'section.unknown')).toBe(
      true,
    )
  })
  it('supports translated content and preserves default values independently', () => {
    const input = migrated()
    input.i18n.locales.push({ code: 'ar', label: 'العربية', direction: 'rtl' })
    input.brand.name = { values: { 'en-US': 'Orbit', ar: 'أوربت' } }
    const config = normalizeStoreConfig(input, { locale: 'ar' })
    expect(config.brand.name).toBe('أوربت')
    expect(config.engine?.i18n.defaultLocale).toBe('en-US')
  })
  it('registers independent extension schemas without modifying the builtin renderer', () => {
    const registry = createStorefrontEngine({
      sections: [
        {
          type: 'demo:notice',
          version: 1,
          schema: z.strictObject({
            id: z.string(),
            type: z.literal('demo:notice'),
            enabled: z.boolean().default(true),
            message: z.string(),
          }),
          description: 'Demo',
        },
      ],
    })
    const input = migrated()
    input.pages[1].sections = [{ id: 'notice', type: 'demo:notice', message: 'Welcome' }]
    expect(validateStoreConfig(input, { registry }).ok).toBe(true)
    expect(validateStoreConfig(input).ok).toBe(false)
    expect(() =>
      createStorefrontEngine({
        sections: [{ type: 'hero', version: 1, schema: z.object({}), description: 'Bad' }],
      }),
    ).toThrow()
  })
  it('resolves typed business and page destinations safely', () => {
    const input = migrated()
    input.business = {
      contacts: [{ id: 'phone', kind: 'phone', label: 'Call', value: '+1 202 555 0100' }],
    }
    const config = normalizeStoreConfig(input, { ...catalog })
    const context = { engine: config.engine!, locale: config.locale, ...catalog }
    expect(resolveDestination({ kind: 'page', pageId: 'contact' }, context)).toBe('/contact')
    expect(resolveDestination({ kind: 'phone', contactId: 'phone' }, context)).toBe(
      'tel:+12025550100',
    )
    expect(resolveDestination({ kind: 'product', productId: 'missing' }, context)).toBeUndefined()
  })
  it('resolves responsive layers without losing zero or false or leaking mobile into desktop', () => {
    const layers = [
      { base: { gap: 2, visible: true }, mobile: { gap: 1, visible: false } },
      { base: { gap: 0, visible: true } },
    ]
    expect(resolveResponsive(layers, 'mobile')).toEqual({ gap: 0, visible: true })
    expect(resolveResponsive([layers[0]], 'desktop')).toEqual({ gap: 2, visible: true })
  })
})

it('layers template defaults, global commerce settings and sparse entity overrides', () => {
  const input = migrated()
  input.template = 'fashion'
  input.commerce = {
    product: { stickySummary: false, related: { inStock: true, limit: 3 } },
    products: { [catalog.products[0].id]: { gallery: 'rail' } },
  }
  const result = normalizeStoreConfig(input)
  expect(result.engine!.commerce.product.gallery).toBe('stacked')
  expect(result.engine!.commerce.product.stickySummary).toBe(false)
  expect(result.engine!.commerce.products[catalog.products[0].id]).toMatchObject({
    gallery: 'rail',
    stickySummary: false,
    related: { inStock: true, limit: 3 },
  })
})
