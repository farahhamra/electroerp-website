import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const preset of [
  { id: 'electronics', menu: 'Shop departments', category: 'Audio', categoryId: 'audio' },
  { id: 'fashion', menu: 'Collections', category: 'Clothing', categoryId: 'clothing' },
  { id: 'home', menu: 'Find your room', category: 'Furniture', categoryId: 'furniture' },
]) {
  test(`${preset.id}: configured navigation dropdown, category filtering and footer links`, async ({
    page,
    isMobile,
  }) => {
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: {
          mode: 'mock',
          configUrl: `stores/${preset.id}.json`,
          catalogUrl: `catalogs/${preset.id}.json`,
        },
      }),
    )
    // Deliberately give all templates the same palette: their composition must stand alone.
    const config = JSON.parse(readFileSync(`public/stores/${preset.id}.json`, 'utf8'))
    const neutral = JSON.parse(readFileSync('public/stores/electronics.json', 'utf8')).theme
    config.theme = {
      ...config.theme,
      background: neutral.background,
      foreground: neutral.foreground,
      surface: neutral.surface,
      accent: neutral.accent,
    }
    await page.route(`**/stores/${preset.id}.json`, (route) => route.fulfill({ json: config }))
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    if (isMobile) await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    const trigger = page.getByRole('button', { name: preset.menu, exact: true })
    await trigger.click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).not.toBeVisible()
    await expect(trigger).toBeFocused()
    if (isMobile)
      await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toBeVisible()
    await trigger.click()
    await page.getByRole('menuitem', { name: preset.category, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`category=${preset.categoryId}`))
    await expect(page.locator('.product-card').first()).toBeVisible()
    if (isMobile)
      await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: 'Sort products' }).click()
    await page.getByRole('option', { name: 'Name: A–Z', exact: true }).click()
    await expect(page).toHaveURL(/sort=name/)
    await page.getByRole('contentinfo').getByRole('link', { name: 'Shipping & returns' }).click()
    await expect(page.getByRole('heading', { name: 'Good things, on their way.' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('dropdown keyboard navigation, escape, typeahead, reset and outside dismissal', async ({
  page,
}) => {
  await page.goto('/#/catalog')
  const sort = page.getByRole('combobox', { name: 'Sort products' })
  await sort.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('listbox')).toBeVisible()
  await expect(page.getByRole('option', { name: 'Featured', exact: true })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('option', { name: 'Name: A–Z', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(sort).toContainText('Name: A–Z')
  await expect(sort).toBeFocused()
  await sort.press('Enter')
  await expect(page.getByRole('option', { name: 'Name: A–Z', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.getByRole('option', { name: 'Featured', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(sort).toContainText('Name: A–Z')
  await expect(sort).toBeFocused()
  const brand = page.getByRole('combobox', { name: 'Brand', exact: true })
  await brand.click()
  await expect(page.getByRole('option', { name: 'All brands', exact: true })).toBeFocused()
  await page.keyboard.press('o')
  await expect(page.getByRole('option', { name: 'Orbit', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(brand).toContainText('Orbit')
  await brand.click()
  await page.getByRole('option', { name: 'All brands', exact: true }).click()
  await expect(page).not.toHaveURL(/brand=/)
  await sort.click()
  const bounds = await page.getByRole('listbox').boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await page.mouse.click(4, 4)
  await expect(page.getByRole('listbox')).not.toBeVisible()
})

test('country dropdown receives validation focus and completes checkout with keyboard', async ({
  page,
}) => {
  await page.goto('/#/products/orbit-one')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/#/checkout')
  await page.getByLabel('Full name').fill('Demo Customer')
  await page.getByLabel('Email address').fill('demo@example.com')
  await page.getByLabel('Phone number').fill('+1 202 555 0100')
  await page.getByLabel('Street address').fill('123 Example Street')
  await page.getByLabel('City', { exact: true }).fill('Example City')
  await page.getByRole('button', { name: 'Complete demo order' }).click()
  const country = page.getByRole('combobox', { name: 'Country / region' })
  await expect(country).toBeFocused()
  await expect(country).toHaveAttribute('aria-invalid', 'true')
  await expect(country).toHaveAttribute('aria-describedby', 'error-country')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: 'United States', exact: true })).toBeFocused()
  await page.keyboard.press('l')
  await expect(page.getByRole('option', { name: 'Lebanon', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(country).toContainText('Lebanon')
  await page.getByRole('button', { name: 'Complete demo order' }).click()
  await expect(
    page.getByText('This is a demonstration. No payment was collected and no order was sent.'),
  ).toBeVisible()
})
