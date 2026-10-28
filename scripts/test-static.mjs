import { createServer } from 'node:http'
import { readFile, writeFile, stat, mkdtemp, rm } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const exec = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), 'engine-static-test-'))
const types = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
}
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
  headless: true,
})
try {
  for (const base of ['/', '/shop/']) {
    const root = join(directory, base === '/' ? 'root' : 'shop')
    await exec(
      process.execPath,
      ['scripts/prerender-store.mjs', '--history', '--base', base, '--out', root],
      { maxBuffer: 10 * 1024 * 1024 },
    )
    const catalog = JSON.parse(await readFile(join(root, 'generated-catalog.json'), 'utf8'))
    const coverage = JSON.parse(await readFile(join(root, 'route-coverage.json'), 'utf8'))
    assert.equal(coverage.complete, true)
    assert.ok(coverage.routes.length > 20)
    const raw = await readFile(join(root, 'experience', 'index.html'), 'utf8')
    assert.ok(raw.includes('Made for everyday.'))
    assert.ok(raw.includes('property="og:title"'))
    assert.ok(raw.includes('application/ld+json'))
    assert.ok(!raw.includes('"customer":'))
    const arabic = await readFile(join(root, 'ar', 'التجربة', 'index.html'), 'utf8')
    assert.ok(arabic.includes('dir="rtl"'))
    assert.ok(arabic.includes('مصمّم لكل يوم.'))
    const server = createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
        if (path.endsWith('/favicon.ico')) {
          res.statusCode = 204
          res.end()
          return
        }
        if (!path.startsWith(base)) {
          res.statusCode = 404
          res.end()
          return
        }
        let file = join(root, path.slice(base.length)),
          status = 200
        try {
          if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
        } catch {
          if (/\/(cart|checkout)\/?$/.test(path)) file = join(root, 'app.html')
          else {
            file = join(root, '404.html')
            status = 404
          }
        }
        res.statusCode = status
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
        res.end(await readFile(file))
      } catch {
        res.statusCode = 500
        res.end('Test host error')
      }
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const origin = `http://127.0.0.1:${server.address().port}`
    const page = await browser.newPage(),
      errors = [],
      missing = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource'))
        errors.push(message.text())
    })
    await page.addInitScript(() => {
      window.integrationDiagnostics = []
      window.addEventListener('storefront:diagnostics', (event) =>
        window.integrationDiagnostics.push(...event.detail),
      )
    })
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().endsWith('/missing')) missing.push(r.url())
    })
    try {
      for (const route of ['experience/', 'ar/التجربة/', `products/${catalog.products[0].slug}/`]) {
        await page.goto(origin + base + route)
        await page.locator('h1').waitFor()
        await page.waitForLoadState('networkidle')
        assert.equal(await page.locator('h1').count(), 1)
        assert.deepEqual(
          await page
            .locator('img')
            .evaluateAll((images) =>
              images.filter((i) => i.complete && !i.naturalWidth).map((i) => i.src),
            ),
          [],
        )
      }
      await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
      await page.goto(origin + base + 'cart')
      await page.locator('.cart-line').waitFor()
      assert.equal(await page.locator('.cart-line').count(), 1)
      await page.reload()
      await page.locator('.cart-line').waitFor()
      assert.equal(await page.locator('.cart-line').count(), 1)
      const response = await page.goto(origin + base + 'missing')
      assert.equal(response.status(), 404)
      await page.locator('h1').waitFor()
      assert.ok(
        (await page.locator('meta[name="robots"]').getAttribute('content')).startsWith('noindex'),
      )
      const liveConfigPath = join(root, 'generated-store.json')
      const liveConfig = JSON.parse(await readFile(liveConfigPath, 'utf8'))
      liveConfig.brand.name = 'ORBIT LIVE'
      await writeFile(liveConfigPath, JSON.stringify(liveConfig))
      await page.goto(origin + base + 'experience/')
      await page.waitForFunction(() =>
        window.integrationDiagnostics.some((d) => d.code === 'deployment.snapshot_stale'),
      )
      await page.waitForFunction(() =>
        document.querySelector('header')?.textContent.includes('ORBIT LIVE'),
      )
      assert.deepEqual(errors, [])
      assert.deepEqual(missing, [])
      console.log(
        `PASS ${base}: ${coverage.routes.length} generated routes, raw SEO, bilingual hydration, images, saved cart, direct routes, revision revalidation and HTTP 404`,
      )
    } finally {
      await page.close()
      await new Promise((resolve) => server.close(resolve))
    }
  }
} finally {
  await browser.close()
  await rm(directory, { recursive: true, force: true })
}
