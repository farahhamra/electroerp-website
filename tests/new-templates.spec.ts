import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

for (const name of ['beauty', 'outdoor']) {
  test(`${name}: exact model search, variants, local artwork and narrow-screen layouts`, async ({
    page,
  }) => {
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: {
          mode: 'mock',
          configUrl: `stores/${name}.json`,
          catalogUrl: `catalogs/${name}.json`,
        },
      }),
    )
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const broken = await page.locator('img').evaluateAll(async (images) => {
      const assets = images as HTMLImageElement[]
      await Promise.all(
        assets.map(async (image) => {
          image.loading = 'eager'
          try {
            await image.decode()
          } catch {
            /* Count failed decodes below. */
          }
        }),
      )
      return assets.filter((image) => !image.naturalWidth).map((image) => image.src)
    })
    expect(broken).toEqual([])
    await page.getByRole('button', { name: 'Open search' }).click()
    const search = page.getByRole('combobox', { name: 'Search products' })
    await search.fill(name === 'beauty' ? 'SR-D01' : 'NL-P24')
    await expect(page.getByRole('option')).toHaveCount(1)
    await search.press('ArrowDown')
    await search.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      name === 'beauty' ? 'Daily Dew Serum' : 'Ridge 24 Pack',
    )
    await page
      .getByRole('button', { name: name === 'beauty' ? '50 ml' : 'Clay', exact: true })
      .click()
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
    await page.goto('/#/cart')
    await page.reload()
    await expect(page.locator('.cart-line')).toContainText(name === 'beauty' ? '50 ml' : 'Clay')
    await page.setViewportSize({ width: 320, height: 760 })
    for (const route of [
      '/',
      '/#/catalog',
      `/#/products/${name === 'beauty' ? 'daily-dew-serum' : 'ridge-24-pack'}`,
      '/#/cart',
      '/#/checkout',
    ]) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        route,
      ).toBe(true)
    }
    expect(errors).toEqual([])
  })
  test(`${name}: slot mixing and native JSON presentation overrides`, async ({
    page,
    isMobile,
  }) => {
    const config = JSON.parse(readFileSync(`public/stores/${name}.json`, 'utf8'))
    const other = name === 'beauty' ? 'outdoor' : 'beauty'
    config.presentation.header = {
      template: other,
      sticky: true,
      density: 'compact',
      showSearch: false,
      showAnnouncement: false,
      showTagline: false,
    }
    config.presentation.footer = { showDescription: false, showWordmark: false, showLocale: false }
    config.footer.columns = [
      { title: 'Our collection', links: [{ label: 'Everything', href: '/catalog' }] },
    ]
    config.sections[0].imageFit = 'cover'
    config.sections[0].imagePosition = { x: 25, y: 75 }
    config.sections[0].style = { tone: 'surface', spacing: 'compact' }
    const products = config.sections.find(
      (section: { type: string }) => section.type === 'products',
    )
    products.limit = 2
    products.card = { imageRatio: 'landscape', showCategory: false, quickAdd: false }
    const categories = config.sections.find(
      (section: { type: string }) => section.type === 'categories',
    )
    categories.categoryIds = [name === 'beauty' ? 'body' : 'camp']
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: { mode: 'mock', configUrl: 'test-config.json', catalogUrl: `catalogs/${name}.json` },
      }),
    )
    await page.route('**/test-config.json', (route) => route.fulfill({ json: config }))
    await page.goto('/')
    await expect(page.locator(`header.${other}-header`)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Open search' })).toHaveCount(0)
    await expect(page.locator(`#hero [data-section-image]`)).toHaveCSS('object-position', '25% 75%')
    await expect(page.locator('#featured .product-card')).toHaveCount(2)
    await expect(page.locator('#featured .product-category, #featured .quick-add')).toHaveCount(0)
    const image = await page.locator('#featured .product-image-wrap').first().boundingBox()
    expect(image!.width / image!.height).toBeCloseTo(4 / 3, 1)
    await expect(page.locator('#categories h3')).toHaveText([
      name === 'beauty' ? 'For your body' : 'At camp',
    ])
    await expect(page.getByRole('navigation', { name: 'Our collection' })).toBeVisible()
    await expect(page.locator('footer .brand')).toHaveCount(0)
    await page
      .getByRole('navigation', { name: 'Our collection' })
      .getByRole('link', { name: 'Everything' })
      .click()
    await expect(page).toHaveURL(/#\/catalog$/)
    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu', exact: true }).click()
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
  })
  test(`${name}: complete customized example renders optional layouts`, async ({
    page,
    isMobile,
  }) => {
    await page.route('**/storefront.json', (route) =>
      route.fulfill({
        json: {
          mode: 'mock',
          configUrl: `stores/examples/${name}.json`,
          catalogUrl: `catalogs/${name}.json`,
        },
      }),
    )
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('#featured .product-card')).toHaveCount(6)
    await page.getByText('Is this a real store?', { exact: true }).click()
    await expect(
      page.getByText(
        'This is a fictional demonstration. No payment is collected and no order is sent.',
        { exact: true },
      ),
    ).toBeVisible()
    await page.goto('/#/catalog')
    await expect(page.locator('.product-card')).toHaveCount(6)
    expect(
      await page
        .locator('.catalog-grid')
        .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length),
    ).toBe(isMobile ? 1 : 3)
    await expect(page.getByRole('combobox', { name: 'Brand', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    )
  })
}
