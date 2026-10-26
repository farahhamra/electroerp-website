import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
async function loadConfig(page: Page, config: ReturnType<typeof read>, catalog = 'electronics') {
  await page.route('**/storefront.json', (route) =>
    route.fulfill({
      json: {
        mode: 'mock',
        configUrl: 'configured-store.json',
        catalogUrl: `catalogs/${catalog}.json`,
      },
    }),
  )
  await page.route('**/configured-store.json', (route) => route.fulfill({ json: config }))
  await page.goto('/')
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
}
for (const name of ['electronics', 'fashion', 'home']) {
  test(`${name}: customized composition, inherited card settings, FAQ and catalog`, async ({
    page,
    isMobile,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const config = read(`public/stores/examples/${name}.json`)
    const catalog = read(`public/catalogs/${name}.json`)
    await loadConfig(page, config, name)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('header')).toHaveClass(
      new RegExp(`${name === 'home' ? 'fashion' : name === 'electronics' ? 'tech' : name}-header`),
    )
    await expect(page.locator('footer')).toHaveClass(
      new RegExp(`${name === 'electronics' ? 'fashion' : name}-footer`),
    )
    await expect(page.locator('#banner')).toHaveCount(0)
    expect(
      await page
        .locator('.section-frame')
        .evaluateAll((sections) => sections.map((section) => section.id)),
    ).toEqual(
      config.sections
        .filter((s: { enabled?: boolean }) => s.enabled !== false)
        .map((s: { id: string }) => s.id),
    )
    const cards = page.locator('#featured .product-card')
    await expect(cards).toHaveCount(Math.min(catalog.products.length, 6))
    await expect(cards.first().locator('.product-name')).toHaveText(catalog.products[0].name)
    await expect(cards.first().locator('.product-brand')).toBeVisible()
    await expect(cards.first().locator('.product-category')).toHaveCount(0)
    await expect(cards.first().locator('.quick-add')).toHaveCount(0)
    await expect(cards.first()).toHaveAttribute(
      'data-image-ratio',
      name === 'fashion' ? 'portrait' : 'square',
    )
    const image = await cards.first().locator('.product-image-wrap').boundingBox()
    expect(image!.width / image!.height).toBeCloseTo(name === 'fashion' ? 0.75 : 1, 1)
    await expect(page.getByRole('navigation', { name: 'We can help' })).toBeVisible()
    const faq = page.getByText('Can I place a real order here?', { exact: true })
    await faq.focus()
    await page.keyboard.press('Enter')
    await expect(
      page.getByText(
        'This is a fictional demonstration storefront. No payment is collected and no order is sent.',
        { exact: true },
      ),
    ).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('.config-faq details').first()).not.toHaveAttribute('open', '')
    await noOverflow(page)
    await page.goto('/#/catalog')
    await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveText(
      'Price: low to high',
    )
    await expect(page.getByRole('combobox', { name: 'Brand', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Maximum price (USD)')).toBeVisible()
    const columns = await page
      .locator('.catalog-grid')
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(isMobile ? 1 : config.presentation.catalog.columns)
    // Home's native right sidebar must not leave explicit grid positions behind.
    const aside = await page.locator('.catalog-layout aside').boundingBox()
    const grid = await page.locator('.catalog-grid').boundingBox()
    if (isMobile || config.presentation.catalog.layout === 'toolbar')
      expect(aside!.y + aside!.height).toBeLessThanOrEqual(grid!.y)
    else expect(aside!.x + aside!.width).toBeLessThan(grid!.x)
    await noOverflow(page)
    expect(errors).toEqual([])
  })
}

test('independent slots, themes, section tone, visibility and per-section template', async ({
  page,
  isMobile,
}) => {
  const config = read('public/stores/electronics.json')
  config.presentation = {
    header: { template: 'home', showSearch: false, showAnnouncement: false, sticky: true },
    footer: { template: 'fashion', showDescription: false, showWordmark: false, showLocale: false },
    benefitsPosition: 'hidden',
  }
  config.theme = {
    ...config.theme,
    contentWidth: 960,
    headingWeight: 600,
    buttonShape: 'pill',
    motion: 'reduced',
  }
  config.sections = [
    {
      ...config.sections[0],
      layout: 'split',
      imageSide: 'left',
      imageFit: 'cover',
      imagePosition: { x: 25, y: 70 },
      style: { tone: 'accent', spacing: 'compact', width: 'contained' },
    },
    {
      ...config.sections.find((s: { type: string }) => s.type === 'categories'),
      template: 'fashion',
      categoryIds: ['cameras', 'audio'],
    },
    { ...config.sections.find((s: { type: string }) => s.type === 'products'), enabled: false },
  ]
  await loadConfig(page, config)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('header.home-header')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open search' })).toHaveCount(0)
  await expect(page.locator('.home-announcement')).toHaveCount(0)
  await expect(page.locator('#featured')).toHaveCount(0)
  await expect(page.locator('.fashion-footer-wordmark')).toHaveCount(0)
  await expect(page.locator('#categories .fashion-collection h3')).toHaveText(['Cameras', 'Audio'])
  await expect(page.locator('#hero')).toHaveCSS('background-color', 'rgb(38, 63, 236)')
  await expect(page.locator('#hero img')).toHaveCSS('object-position', '25% 70%')
  await expect(page.locator('#hero .button')).toHaveCSS('border-radius', '99px')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-weight', '600')
  if (!isMobile) expect((await page.locator('#hero').boundingBox())!.width).toBe(960)
  await page.evaluate(() => window.scrollTo(0, 400))
  expect((await page.locator('header').boundingBox())!.y).toBe(0)
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
  }
  await noOverflow(page)
})

test('hidden catalog filters retain clearable URLs and default sort', async ({ page }) => {
  const config = read('public/stores/home.json')
  config.presentation = {
    catalog: {
      showCategoryTabs: false,
      defaultSort: 'name',
      filters: { search: false, brand: false, price: false, availability: false },
    },
  }
  await loadConfig(page, config, 'home')
  await page.goto('/#/catalog?category=missing')
  await expect(page.getByRole('heading', { name: 'Nothing here just yet.' })).toBeVisible()
  await expect(page.locator('.catalog-layout aside')).toHaveCount(0)
  await expect(page.locator('.category-tabs')).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.locator('.catalog-grid .product-card').first()).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveText('Name: A–Z')
  const names = await page.locator('.catalog-grid .product-name').allTextContents()
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  await noOverflow(page)
})

test('invalid custom settings show a recoverable load error', async ({ page }) => {
  const config = read('public/stores/home.json')
  config.presentation = { header: { template: 'missing-template' } }
  await loadConfig(page, config, 'home')
  await expect(page.getByRole('alert')).toContainText('We couldn’t load this storefront')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})
