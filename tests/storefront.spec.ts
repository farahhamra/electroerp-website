import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('home, catalog filters, and price sorting', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Less noise. More feeling.' })).toBeVisible()
  await page.goto('/#/catalog')
  await expect(page.getByRole('status').filter({ hasText: '8 products' })).toBeVisible()
  await page.getByRole('button', { name: 'Audio', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '5 products' })).toBeVisible()
  await page.getByLabel('In stock only').check()
  await expect(page.getByRole('status').filter({ hasText: '4 products' })).toBeVisible()
  await page.getByRole('combobox', { name: 'Sort products' }).click()
  await page.getByRole('option', { name: 'Price: low to high', exact: true }).click()
  await expect(page.locator('.product-name').first()).toHaveText('Orbit Mini Speaker')
  await page.getByLabel('Maximum price (USD)').fill('100')
  await expect(page.locator('.product-card')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('fuzzy search supports keyboard selection and dialog focus restoration', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Open search' }).click()
  const input = page.getByRole('combobox', { name: 'Search products' })
  await input.fill('headphnes')
  await expect(page.getByRole('option').first()).toBeVisible()
  await input.press('ArrowDown')
  await expect(input).toHaveAttribute('aria-activedescendant', /-0$/)
  await input.press('Enter')
  await expect(page).toHaveURL(/products\/orbit-(one|studio)/)
  await page.getByRole('button', { name: 'Open search' }).click()
  await input.fill('ORB-A2')
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option')).toContainText('Orbit Air Earbuds')
  await input.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Open search' })).toBeFocused()
})

test('variants, persistent cart, validation, and demo order confirmation', async ({ page }) => {
  await page.goto('/#/products/orbit-air')
  await page.getByRole('button', { name: 'Graphite · Sold out' }).click()
  await expect(page.getByRole('button', { name: 'Sold out', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Cloud', exact: true }).click()
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.getByRole('link', { name: 'Shopping bag, 1 items' }).click()
  await page.reload()
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await page.getByRole('button', { name: 'Increase Orbit Air Earbuds quantity' }).click()
  await expect(page.locator('.summary-total')).toContainText('$258.00')
  await page.getByRole('link', { name: 'Continue to checkout' }).click()
  await page.getByRole('button', { name: 'Complete demo order' }).click()
  await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Full name')).toBeFocused()
  await page.getByLabel('Full name').fill('Demo Customer')
  await page.getByLabel('Email address').fill('demo@example.com')
  await page.getByLabel('Phone number').fill('+1 202 555 0100')
  await page.getByLabel('Street address').fill('123 Example Street')
  await page.getByLabel('City', { exact: true }).fill('Example City')
  await page.getByRole('combobox', { name: 'Country / region' }).click()
  await page.getByRole('option', { name: 'United States', exact: true }).click()
  await page.getByRole('button', { name: 'Complete demo order' }).click()
  await expect(
    page.getByText('This is a demonstration. No payment was collected and no order was sent.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Shopping bag, 0 items' })).toBeVisible()
  const stored = await page.evaluate(() => JSON.stringify(localStorage))
  expect(stored).not.toContain('demo@example.com')
})

test('unknown products and empty search are handled', async ({ page }) => {
  await page.goto('/#/products/does-not-exist')
  await expect(page.getByRole('heading', { name: 'This one got away.' })).toBeVisible()
  await page.goto('/#/catalog?q=bananas')
  await expect(page.getByRole('heading', { name: 'Nothing here just yet.' })).toBeVisible()
  await page.getByRole('button', { name: 'View all products' }).click()
  await expect(page.locator('.product-card')).toHaveCount(8)
})

for (const [template, heading] of [
  ['fashion', 'A quieter kind of statement.'],
  ['home', 'Come home to considered.'],
]) {
  test(`${template} template renders from JSON with working products`, async ({ page }) => {
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: {
          mode: 'mock',
          configUrl: `stores/${template}.json`,
          catalogUrl: `catalogs/${template}.json`,
        },
      }),
    )
    await page.goto('/')
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await page.locator('.product-name').first().click()
    await expect(page.getByRole('button', { name: 'Add to bag', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Shopping bag, 1 items' })).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
  })
}

test('broken configuration presents a retry state', async ({ page }) => {
  await page.route('**/stores/electronics.json', (route) =>
    route.fulfill({ json: { version: 999 } }),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('We couldn’t load this storefront.')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('all routes fit the viewport and product images resolve', async ({ page }) => {
  for (const path of ['/', '/#/catalog', '/#/products/orbit-one', '/#/cart']) {
    await page.goto(path)
    await expect(page.locator('header')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    const broken = await page
      .locator('img')
      .evaluateAll(
        (images) =>
          images.filter(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth === 0,
          ).length,
      )
    expect(broken).toBe(0)
  }
})

test('API provider uses configured search endpoint and surfaces order errors', async ({ page }) => {
  const catalog = JSON.parse(readFileSync('public/catalogs/electronics.json', 'utf8'))
  let searched = false
  let submitted = false
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'api',
        configUrl: 'stores/electronics.json',
        catalogUrl: 'catalogs/electronics.json',
        searchUrl: 'api/search',
        productUrl: 'api/product',
        ordersUrl: 'api/orders',
      },
    }),
  )
  await page.route('**/api/search?*', (route) => {
    searched = new URL(route.request().url()).searchParams.get('q') === 'headphnes'
    return route.fulfill({ json: [catalog.products[0]] })
  })
  await page.route('**/api/orders', (route) => {
    submitted = true
    const body = route.request().postDataJSON()
    expect(body.items).toHaveLength(1)
    expect(body).not.toHaveProperty('total')
    expect(route.request().headers()['idempotency-key']).toBeTruthy()
    return route.fulfill({ status: 503, json: { error: 'Unavailable' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox', { name: 'Search products' }).fill('headphnes')
  await page.getByRole('option').click()
  expect(searched).toBe(true)
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/#/checkout')
  await page.getByLabel('Full name').fill('Demo Customer')
  await page.getByLabel('Email address').fill('demo@example.com')
  await page.getByLabel('Phone number').fill('+1 202 555 0100')
  await page.getByLabel('Street address').fill('123 Example Street')
  await page.getByLabel('City', { exact: true }).fill('Example City')
  await page.getByRole('combobox', { name: 'Country / region' }).click()
  await page.getByRole('option', { name: 'United States', exact: true }).click()
  await page.getByRole('button', { name: 'Submit order request' }).click()
  await expect(page.getByRole('alert')).toContainText('503')
  expect(submitted).toBe(true)
  await expect(page.getByRole('link', { name: 'Shopping bag, 1 items' })).toBeVisible()
})

test('server search products outside the initial catalog survive detail navigation and cart reload', async ({
  page,
}) => {
  const catalog = JSON.parse(readFileSync('public/catalogs/electronics.json', 'utf8'))
  const remote = {
    ...catalog.products[0],
    id: 'remote-product',
    slug: 'remote-product',
    name: 'Remote Headphones',
    model: 'REM-H1',
  }
  let hydrated = false
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'api',
        configUrl: 'stores/electronics.json',
        catalogUrl: 'catalogs/electronics.json',
        searchUrl: 'api/search',
        productUrl: 'api/product',
        ordersUrl: 'api/orders',
      },
    }),
  )
  await page.route('**/api/search?*', (route) => route.fulfill({ json: [remote] }))
  await page.route('**/api/product?*', (route) => {
    const url = new URL(route.request().url())
    hydrated = url.searchParams.get('id') === 'remote-product'
    return route.fulfill({ json: remote })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open search' }).click()
  await page.getByRole('combobox', { name: 'Search products' }).fill('remote')
  await page.getByRole('option').click()
  await expect(page.getByRole('heading', { name: 'Remote Headphones' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.getByRole('link', { name: 'Shopping bag, 1 items' }).click()
  await page.reload()
  await expect(page.locator('.cart-line')).toContainText('Remote Headphones')
  expect(hydrated).toBe(true)
  await page.evaluate(() => localStorage.clear())
  await page.goto('/#/products/remote-product')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Remote Headphones' })).toBeVisible()
})
