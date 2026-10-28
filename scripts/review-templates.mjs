import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { preview } from 'vite'
const args = process.argv.slice(2)
const arg = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback)
const output = resolve(arg('--out', '/tmp/engine-visual-review'))
const baseline = arg('--baseline', '')
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
})
const records = []
await mkdir(output, { recursive: true })
try {
  for (const [label, root] of [
    ...(baseline ? [['baseline', resolve(baseline)]] : []),
    ['current', process.cwd()],
  ]) {
    const server = await preview({
      root,
      logLevel: 'silent',
      preview: { host: '127.0.0.1', port: 0, strictPort: true },
    })
    try {
      for (const template of ['electronics', 'fashion', 'home', 'beauty', 'outdoor']) {
        for (const rtl of label === 'current' ? [false, true] : [false]) {
          const page = await browser.newPage({
            reducedMotion: 'reduce',
            locale: 'en-US',
            timezoneId: 'UTC',
          })
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          const bootstrap = rtl
            ? {
                mode: 'mock',
                configUrl: 'stores/examples/engine-v2.json',
                catalogUrl: 'catalogs/engine-v2.json',
              }
            : {
                mode: 'mock',
                configUrl: `stores/${template}.json`,
                catalogUrl: `catalogs/${template}.json`,
              }
          await page.route('**/storefront.json', (route) => route.fulfill({ json: bootstrap }))
          if (rtl) {
            const config = JSON.parse(
              await readFile('public/stores/examples/engine-v2.json', 'utf8'),
            )
            config.template = template
            await page.route('**/stores/examples/engine-v2.json', (route) =>
              route.fulfill({ json: config }),
            )
          }
          await page.goto(
            `http://127.0.0.1:${server.httpServer.address().port}/${rtl ? '#/ar/' : ''}`,
          )
          await page.getByRole('heading', { level: 1 }).waitFor()
          await page.evaluate(async () => {
            await document.fonts.ready
            await Promise.all(
              [...document.images].map(async (image) => {
                image.loading = 'eager'
                await image.decode().catch(() => {})
              }),
            )
          })
          for (const width of [390, 820, 1440]) {
            await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 })
            const result = await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth > innerWidth,
              headings: document.querySelectorAll('h1').length,
              direction: document.documentElement.dir,
              brokenImages: [...document.images].filter(
                (image) => image.complete && !image.naturalWidth,
              ).length,
            }))
            const filename = `${label}-${template}-${rtl ? 'rtl' : 'ltr'}-${width}.jpg`
            await page.screenshot({
              path: join(output, filename),
              quality: 80,
              type: 'jpeg',
              animations: 'disabled',
            })
            records.push({ filename, ...result, errors: [...errors] })
            if (result.overflow || result.headings !== 1 || result.brokenImages || errors.length)
              throw new Error(
                `Visual fixture failed: ${filename}: ${JSON.stringify(result)} ${errors.join(';')}`,
              )
          }
          await page.close()
        }
      }
    } finally {
      await new Promise((resolve) => server.httpServer.close(resolve))
    }
  }
  await writeFile(join(output, 'review.json'), JSON.stringify(records, null, 2) + '\n')
  console.log(
    `Captured ${records.length} fixtures; no overflow, broken images, duplicate h1 or page errors.`,
  )
} finally {
  await browser.close()
}
