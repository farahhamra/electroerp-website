import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { normalizeStoreConfig } from '../config/normalize'
import { buildHead, headTags, safeJson } from './head'
const input = JSON.parse(readFileSync('public/stores/examples/engine-v2.json', 'utf8'))
const catalog = JSON.parse(readFileSync('public/catalogs/engine-v2.json', 'utf8'))
const data = { config: normalizeStoreConfig(input, catalog), ...catalog }
describe('SEO output', () => {
  it('resolves page metadata, actual locale alternates and default noindex routes', () => {
    const head = buildHead(data, '/experience')
    expect(head.title).toBe('Made for everyday.')
    expect(head.alternates.map((a) => a.locale)).toEqual(['en-US', 'ar'])
    expect(buildHead(data, '/checkout').robots).toBe('noindex,follow')
    expect(buildHead(data, '/catalog', '?price=20').robots).toBe('noindex,follow')
  })
  it('uses factual offers and escapes merchant content in HTML and JSON-LD', () => {
    const head = buildHead(data, '/products/' + catalog.products[0].slug)
    expect(head.structured.some((entry: any) => entry['@type'] === 'Product')).toBe(true)
    head.title = '</title><script>alert(1)</script>'
    expect(headTags(head)).not.toContain('<script>alert(1)</script>')
    expect(safeJson({ value: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})

it('keeps subdirectory canonicals and already-rooted media URLs from gaining duplicate bases', () => {
  const store = JSON.parse(JSON.stringify(input))
  store.routing = { mode: 'history', basePath: '/shop/' }
  const products = catalog.products.map((product: any) => ({
    ...product,
    images: product.images.map((path: string) => '/shop/' + path),
  }))
  const config = normalizeStoreConfig(store, { products, categories: catalog.categories })
  const head = buildHead(
    { config, products, categories: catalog.categories },
    '/products/' + products[0].slug,
  )
  expect(head.canonical).toBe('https://store.example.com/shop/products/' + products[0].slug)
  expect(head.image).toBe('https://store.example.com' + products[0].images[0])
})
