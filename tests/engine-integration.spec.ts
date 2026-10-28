import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const fixture = () => read('public/stores/examples/engine-v2.json')
const catalog = read('public/catalogs/engine-v2.json')

test.beforeEach(async ({ page }) => {
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'mock',
        configUrl: 'stores/examples/engine-v2.json',
        catalogUrl: 'catalogs/engine-v2.json',
      },
    }),
  )
})

test('responsive section overrides stay independent at all device boundaries', async ({ page }) => {
  const config = fixture()
  const section = config.pages
    .find((p: any) => p.id === 'experience')
    .sections.find((s: any) => s.id === 'quotes')
  section.design = {
    layout: {
      base: { gap: 2 },
      mobile: { columns: 1, gap: 0 },
      tablet: { columns: 2, gap: 1 },
      desktop: { columns: 3, gap: 3 },
    },
  }
  config.theme.tokens.components.dropdown = { background: '#132b30', color: '#ffffff', radius: 16 }
  await page.route('**/stores/examples/engine-v2.json', (route) => route.fulfill({ json: config }))
  await page.goto('/#/experience')
  const grid = page.locator('#quotes .engine-grid')
  for (const [width, columns, gap] of [
    [767, 1, 0],
    [768, 2, 16],
    [1023, 2, 16],
    [1024, 3, 48],
  ]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(grid).toBeVisible()
    expect(
      await grid.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
      ),
    ).toBe(columns)
    await expect(grid).toHaveCSS('gap', `${gap}px`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/#/catalog')
  await page.getByRole('combobox', { name: 'Sort by' }).click()
  await expect(page.locator('.dropdown-content')).toHaveCSS('background-color', 'rgb(19, 43, 48)')
})

test('language switching preserves product identity, cart and checkout validation', async ({
  page,
}) => {
  await page.goto('/#/products/orbit-one')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.locator('.locale-switch summary').click()
  await page.locator('.locale-switch').getByRole('button', { name: 'العربية' }).click()
  await expect(page).toHaveURL(/#\/ar\/products\/orbit-one/)
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('أوربت')
  await page.goto('/#/ar/cart')
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await page.goto('/#/ar/checkout')
  await page.locator('.checkout-submit').click()
  await expect(page.locator('#customer-name')).toBeFocused()
  await expect(page.locator('#error-name')).toHaveText('يرجى تعبئة هذا الحقل.')
  await page.locator('#customer-name').fill('Demo Customer')
  await page.locator('#customer-email').fill('demo@example.com')
  await page.locator('#customer-phone').fill('+12025550100')
  await page.locator('#customer-address').fill('100 Example Avenue')
  await page.locator('#customer-city').fill('Example City')
  await page.locator('#customer-country').click()
  await page.getByRole('option', { name: 'United States', exact: true }).click()
  await page.locator('.checkout-submit').click()
  await expect(page.locator('#confirmation-heading')).toBeFocused()
  await expect(page.locator('.confirmation')).toContainText('لم يتم تحصيل أي دفعة')
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('demo@example.com')
})

test('a registered provider and localized custom section run through the composition root', async ({
  page,
}) => {
  const config = fixture()
  config.pages[0].sections.push({
    id: 'trusted-notice',
    type: 'demo:notice',
    message: { values: { 'en-US': 'An installed extension', ar: 'امتداد مثبت' } },
  })
  config.extensions = { 'demo:notice': 1, 'demo:fixture': 1 }
  // Embedded fixture config has no document URL; asset URLs are explicitly absolute here.
  const absolute = JSON.parse(JSON.stringify(config).replaceAll('../../images/', '/images/'))
  await page.route('**/storefront.json', (route) =>
    route.fulfill({ json: { mode: 'demo:fixture', config: absolute, ...catalog } }),
  )
  await page.goto('/#/ar')
  await expect(page.locator('#trusted-notice')).toContainText('امتداد مثبت')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('partial API catalogs query remotely, resolve links and add the qualifying variant', async ({
  page,
}) => {
  const config = fixture(),
    product = catalog.products[0]
  config.navigation.push({
    label: 'Resolved product',
    destination: { kind: 'product', productId: product.id },
  })
  const remote = {
    ...product,
    variants: [
      { ...product.variants[0], id: 'api-variant', sku: 'API-001', price: 9900, stock: 5 },
    ],
  }
  const requests: any[] = []
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'api',
        configUrl: 'stores/examples/engine-v2.json',
        catalogUrl: 'api/initial',
        queryUrl: 'api/query',
        resolveUrl: 'api/resolve',
        productUrl: 'api/product',
        categoryUrl: 'api/category',
        ordersUrl: 'api/orders',
      },
    }),
  )
  await page.route('**/stores/examples/engine-v2.json', (route) => route.fulfill({ json: config }))
  await page.route('**/api/initial', (route) =>
    route.fulfill({ json: { products: [], categories: catalog.categories } }),
  )
  await page.route('**/api/resolve', (route) =>
    route.fulfill({ json: { products: [remote], categories: [] } }),
  )
  await page.route('**/api/query', (route) => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({
      json: {
        items: [remote],
        variants: { [remote.id]: 'api-variant' },
        total: 1,
        revision: 'test-1',
      },
    })
  })
  await page.route('**/api/product?*', (route) => route.fulfill({ json: remote }))
  await page.goto('/#/catalog?stock=true')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await expect(page.locator('.product-card')).toContainText('$99.00')
  expect(requests[0]).toMatchObject({
    query: { inStock: true },
    context: { locale: 'en-US', currency: 'USD' },
  })
  const add = page.locator('.product-card button').last()
  await add.click()
  await page.goto('/#/cart')
  await expect(page.locator('.cart-line')).toHaveCount(1)
  // Stable variant IDs are what the order adapter receives, independent of displayed labels.
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toContain('api-variant')
})

test('missing API query capability produces customer-safe feedback and integration diagnostics', async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(window as any).integrationDiagnostics = []
    window.addEventListener('storefront:diagnostics', (event) =>
      (window as any).integrationDiagnostics.push(...(event as CustomEvent).detail),
    )
  })
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'api',
        configUrl: 'stores/examples/engine-v2.json',
        catalogUrl: 'catalogs/engine-v2.json',
        productUrl: 'api/product',
        ordersUrl: 'api/orders',
      },
    }),
  )
  await page.goto('/#/catalog')
  await expect(page.getByRole('alert')).toHaveText(
    'Products are unavailable. Please try again later.',
  )
  await expect(page.locator('.product-card')).toHaveCount(0)
  expect(
    await page.evaluate(() =>
      (window as any).integrationDiagnostics.some((d: any) => d.code === 'collection.unavailable'),
    ),
  ).toBe(true)
})

for (const template of ['electronics', 'fashion', 'home', 'beauty', 'outdoor']) {
  test(`${template} v2 template remains usable in RTL`, async ({ page }) => {
    const config = fixture()
    config.template = template
    await page.route('**/stores/examples/engine-v2.json', (route) =>
      route.fulfill({ json: config }),
    )
    await page.goto('/#/ar')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.goto('/#/ar/products/orbit-one')
    await expect(page.locator('.configured-product .add-to-bag button.button')).toBeVisible()
  })
}
