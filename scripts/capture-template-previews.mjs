import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { build, preview } from 'vite'
import { format, resolveConfig } from 'prettier'

const root = fileURLToPath(new URL('../', import.meta.url))
const viewport = { width: 1440, height: 1080 }
const labels = {
  electronics: 'Electronics',
  fashion: 'Fashion',
  home: 'Home & living',
  beauty: 'Beauty & skincare',
  outdoor: 'Outdoor & adventure',
}
const temporary = await mkdtemp(join(tmpdir(), 'electroerp-previews-'))
let browser
let server

try {
  // Isolate the capture build from normal deployment settings and the project's dist/.
  const outDir = join(temporary, 'site')
  await build({
    root,
    logLevel: 'warn',
    define: { 'import.meta.env.VITE_BOOTSTRAP_URL': JSON.stringify('storefront.json') },
    build: { outDir, emptyOutDir: true },
  })
  server = await preview({
    root,
    logLevel: 'warn',
    build: { outDir },
    preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false },
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Preview server did not start.')
  const origin = `http://127.0.0.1:${address.port}`
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  })
  const manifest = { version: 1, templates: [] }
  const stores = await readdir(join(root, 'public/stores'), { withFileTypes: true })
  const files = stores.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
  for (const entry of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const id = entry.name.slice(0, -5)
    const config = JSON.parse(await readFile(join(root, 'public/stores', entry.name), 'utf8'))
    if (config.template !== id) throw new Error(`${entry.name} must use its matching template.`)
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      colorScheme: 'light',
      locale: 'en-US',
      timezoneId: 'UTC',
      serviceWorkers: 'block',
    })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: {
          mode: 'mock',
          configUrl: `stores/${id}.json`,
          catalogUrl: `catalogs/${id}.json`,
        },
      }),
    )
    await page.goto(origin, { waitUntil: 'networkidle' })
    await page.locator(`.storefront.template-${id}`).waitFor()
    await page.getByRole('heading', { level: 1 }).waitFor()
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(
        [...document.images].map(async (image) => {
          image.loading = 'eager'
          await image.decode()
        }),
      )
      window.scrollTo(0, 0)
      if (document.documentElement.scrollWidth > innerWidth)
        throw new Error('Storefront overflows the screenshot viewport.')
    })
    if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`)
    await page.mouse.move(0, 0)
    await page.screenshot({
      path: join(temporary, `${id}.jpg`),
      type: 'jpeg',
      quality: 85,
      fullPage: false,
      animations: 'disabled',
      caret: 'hide',
    })
    manifest.templates.push({
      id,
      name: labels[id] ?? id,
      demoBrand: config.brand.name,
      image: {
        src: `template-previews/${id}.jpg`,
        alt: `${config.brand.name} — ${labels[id] ?? id} storefront homepage preview`,
        ...viewport,
      },
      configUrl: `stores/${id}.json`,
      catalogUrl: `catalogs/${id}.json`,
    })
    await page.close()
    console.log(`Captured ${id} (${viewport.width} × ${viewport.height})`)
  }
  // Publish the set only after every storefront has rendered successfully.
  const destination = join(root, 'public/template-previews')
  await mkdir(destination, { recursive: true })
  for (const template of manifest.templates)
    await copyFile(join(temporary, `${template.id}.jpg`), join(destination, `${template.id}.jpg`))
  const path = join(root, 'public/template-previews.json')
  await writeFile(
    path,
    await format(JSON.stringify(manifest), { ...(await resolveConfig(path)), parser: 'json' }),
  )
} finally {
  await Promise.allSettled([
    browser?.close(),
    server && new Promise((resolve) => server.httpServer.close(resolve)),
  ])
  await rm(temporary, { recursive: true, force: true })
}
