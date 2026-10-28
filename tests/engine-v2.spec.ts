import { test, expect } from '@playwright/test'
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
test('v2 pages, nested sections, lightbox and typed contact links', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/#/experience')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Made for everyday.')
  await expect(page.getByRole('table')).toBeVisible()
  await page
    .getByRole('button', { name: /View .*Headphones/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.goto('/#/contact')
  await expect(page.locator('a[href="tel:+12025550100"]')).toBeVisible()
  await expect(page.locator('a[href="mailto:hello@example.com"]')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
test('v2 collections, configurable product blocks and cart', async ({ page }) => {
  await page.goto('/#/catalog?stock=true&sort=price-low')
  await expect(page.locator('.product-card').first()).toBeVisible()
  await page.locator('.product-name').first().click()
  await expect(page.locator('.configured-product')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('added to your bag')
  await page.goto('/#/cart')
  await expect(page.locator('.cart-line')).toHaveCount(1)
})
test('v2 locale routes resolve merchant content and direction', async ({ page }) => {
  await page.goto('/#/ar/التجربة')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('مصمّم لكل يوم.')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
