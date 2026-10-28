import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { cpus } from 'node:os'
import { createServer, preview } from 'vite'
import { chromium } from '@playwright/test'
const args = process.argv.slice(2)
const arg = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback)
const output = resolve(arg('--out', '/tmp/engine-measurements.json'))
const baseline = arg('--baseline', '')
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
})
const report = {
  runtime: process.version,
  browser: browser.version(),
  cpu: cpus()[0]?.model,
  measurements: [],
  collections: [],
}
async function measure(label, root, bootstrap) {
  const server = await preview({
    root,
    logLevel: 'silent',
    preview: { host: '127.0.0.1', port: 0, strictPort: true },
  })
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
  })
  try {
    if (bootstrap)
      await page.route('**/storefront.json', (route) => route.fulfill({ json: bootstrap }))
    await page.goto(origin, { waitUntil: 'networkidle' })
    await page.locator('h1').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const resources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((resource) => resource.name),
    )
    const paths = [
      ...new Set(
        resources.filter((url) => url.startsWith(origin)).map((url) => new URL(url).pathname),
      ),
    ]
    let jsGzip = 0,
      jsBytes = 0,
      fontBytes = 0,
      cssGzip = 0
    for (const path of paths) {
      if (!/\.(js|css|woff2)$/.test(path)) continue
      const bytes = await readFile(join(root, 'dist', path))
      if (path.endsWith('.js')) {
        jsBytes += bytes.length
        jsGzip += gzipSync(bytes).length
      }
      if (path.endsWith('.css')) cssGzip += gzipSync(bytes).length
      if (path.endsWith('.woff2')) fontBytes += bytes.length
    }
    report.measurements.push({
      label,
      jsBytes,
      jsGzip,
      cssGzip,
      fontBytes,
      loadedJavaScript: paths.filter((path) => path.endsWith('.js')),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    })
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 })
      await page.screenshot({ path: `/tmp/${label}-${width}.png`, animations: 'disabled' })
    }
    if (bootstrap) {
      await page.goto(origin + '/#/ar/التجربة', { waitUntil: 'networkidle' })
      await page.locator('#quotes blockquote').first().waitFor()
      await page.evaluate(async () => {
        await document.fonts.ready
        await Promise.all(
          [...document.images].map(async (image) => {
            image.loading = 'eager'
            await image.decode().catch(() => {})
          }),
        )
      })
      await page.setViewportSize({ width: 390, height: 844 })
      await page.screenshot({
        path: '/tmp/engine-v2-ar-mobile.png',
        fullPage: true,
        animations: 'disabled',
      })
      await page.setViewportSize({ width: 1440, height: 1080 })
      await page.screenshot({ path: '/tmp/engine-v2-ar-desktop.png', animations: 'disabled' })
    }
  } finally {
    await page.close()
    await new Promise((resolve) => server.httpServer.close(resolve))
  }
}
try {
  if (baseline) await measure('baseline-v1', resolve(baseline))
  await measure('current-v1', process.cwd())
  await measure('current-v2', process.cwd(), {
    mode: 'mock',
    configUrl: 'stores/examples/engine-v2.json',
    catalogUrl: 'catalogs/engine-v2.json',
  })
  const server = await createServer({
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: 'custom',
  })
  try {
    const { evaluateCollection } = await server.ssrLoadModule('/src/core/collections/query.ts')
    const { querySchema } = await server.ssrLoadModule('/src/core/config/contracts.ts')
    const catalog = JSON.parse(await readFile('public/catalogs/engine-v2.json', 'utf8')).products
    const products = Array.from({ length: 10000 }, (_, index) => ({
      ...catalog[index % catalog.length],
      id: `fixture-${index}`,
      name: `Product ${String(index).padStart(5, '0')}`,
      variants: catalog[index % catalog.length].variants.map((variant) => ({
        ...variant,
        id: variant.id + '-' + index,
      })),
    }))
    const context = {
      storeId: 'benchmark',
      locale: 'en-US',
      currency: 'USD',
      revision: 'fixed-10000',
    }
    for (const sort of ['price-low', 'name', 'newest', 'discount']) {
      const query = querySchema.parse({ inStock: true, sort, limit: 24 })
      const runs = []
      for (let index = 0; index < 35; index++) {
        const start = performance.now()
        evaluateCollection(products, query, context)
        if (index >= 5) runs.push(performance.now() - start)
      }
      runs.sort((a, b) => a - b)
      report.collections.push({
        sort,
        products: products.length,
        samples: runs.length,
        p50ms: +runs[14].toFixed(2),
        p95ms: +runs[28].toFixed(2),
      })
    }
  } finally {
    await server.close()
  }
  await mkdir(resolve(output, '..'), { recursive: true })
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
