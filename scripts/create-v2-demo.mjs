import { bilingual, translateDemo } from './demo-translations.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const server = await createServer({
  server: { middlewareMode: true, watch: null, hmr: false },
  appType: 'custom',
})
try {
  const { migrateV1, validateStoreConfig } = await server.ssrLoadModule(
    '/src/core/config/normalize.ts',
  )
  const original = JSON.parse(await readFile('public/stores/electronics.json', 'utf8'))
  const config = JSON.parse(JSON.stringify(migrateV1(original)))
  config.$schema = '../../store-config.v2.schema.json'
  config.i18n.locales.push({ code: 'ar', label: 'العربية', direction: 'rtl' })
  config.i18n.locales[0].label = 'English'
  config.brand.name = { values: { 'en-US': 'ORBIT', ar: 'أوربت' } }
  config.seo = {
    siteUrl: 'https://store.example.com',
    description:
      'A fictional premium electronics storefront. Explore the complete engine demonstration.',
  }
  config.theme.tokens = {
    typography: {
      h2: { base: { size: 2.5, lineHeight: 1.1 }, mobile: { size: 1.8 } },
      navigation: { base: { size: 0.875, letterSpacing: 0.03 } },
    },
    components: { button: { radius: 8 }, card: { radius: 12 } },
  }
  config.business = {
    name: 'ORBIT Demo',
    contacts: [
      { id: 'support', kind: 'email', label: 'Email our demo team', value: 'hello@example.com' },
      { id: 'phone', kind: 'phone', label: 'Call us', value: '+12025550100' },
      { id: 'whatsapp', kind: 'whatsapp', label: 'WhatsApp', value: '+12025550100' },
    ],
    locations: [
      {
        id: 'studio',
        label: 'Fictional ORBIT studio',
        address: { street: '100 Example Avenue', city: 'Example City', country: 'United States' },
        timeZone: 'America/New_York',
        latitude: 40.7128,
        longitude: -74.006,
        hours: {
          mon: { intervals: [{ start: '09:00', end: '18:00' }] },
          tue: { intervals: [{ start: '09:00', end: '18:00' }] },
          wed: { intervals: [{ start: '09:00', end: '18:00' }] },
          thu: { intervals: [{ start: '09:00', end: '18:00' }] },
          fri: { intervals: [{ start: '09:00', end: '18:00' }] },
          sat: { closed: true },
          sun: { closed: true },
        },
        exceptions: { '2026-12-25': { closed: true } },
      },
    ],
  }
  config.collections = {
    audio: { categoryIds: ['audio'], inStock: true, sort: 'price-low', limit: 4 },
    sale: { discounted: true, inStock: true, sort: 'discount', limit: 4 },
    newest: { sort: 'newest', limit: 4 },
  }
  const catalog = JSON.parse(await readFile('public/catalogs/electronics.json', 'utf8'))
  catalog.products = catalog.products.map((p, i) => ({
    ...p,
    createdAt: new Date(Date.UTC(2026, 8, i + 1)).toISOString(),
    specifications: [
      { group: 'Product', label: 'Model', value: p.model },
      { group: 'Product', label: 'Brand', value: p.brand },
    ],
    translations: {
      ar: {
        name: translateDemo(p.name) === p.name ? `${p.name} — إصدار أوربت` : translateDemo(p.name),
        description: 'تصميم متقن وتقنية مفيدة للحياة اليومية.',
        categoryName: translateDemo(p.categoryName),
        details: [
          'منتج توضيحي من مجموعة أوربت.',
          'المواصفات والمخزون والأسعار المعروضة لأغراض العرض فقط.',
        ],
        specifications: [
          { group: 'المنتج', label: 'الطراز', value: p.model },
          { group: 'المنتج', label: 'العلامة التجارية', value: p.brand },
        ],
      },
    },
  }))
  catalog.categories = catalog.categories.map((category) => ({
    ...category,
    translations: {
      ar: {
        name: translateDemo(category.name),
        description: 'مجموعة توضيحية مختارة بعناية.',
        slug: category.id,
      },
    },
  }))
  catalog.products = catalog.products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({
      ...variant,
      translations: {
        ar: {
          label: Object.values(variant.options)
            .map(
              (value) =>
                ({
                  Graphite: 'جرافيت',
                  Cloud: 'أبيض سحابي',
                  Black: 'أسود',
                  Silver: 'فضي',
                  Sand: 'رملي',
                  Sage: 'أخضر',
                  Natural: 'طبيعي',
                })[value] ?? value,
            )
            .join(' / '),
        },
      },
    })),
  }))
  const image = catalog.products[0].images[0]
  config.pages[0].sections.push({
    id: 'audio-selection',
    type: 'collection',
    title: { values: { 'en-US': 'Sound, selected.', ar: 'صوت يستحق الاختيار.' } },
    collectionId: 'audio',
  })
  config.pages.find((p) => p.id === 'contact').sections = [
    {
      id: 'contact-details',
      type: 'contact-details',
      title: 'A direct connection.',
      locationId: 'studio',
    },
    {
      id: 'studio-map',
      type: 'map',
      title: 'Find our demo studio',
      locationId: 'studio',
      embed: true,
    },
  ]
  config.pages.push({
    id: 'experience',
    title: { values: { 'en-US': 'Made for everyday.', ar: 'مصمّم لكل يوم.' } },
    paths: { 'en-US': '/experience', ar: '/التجربة' },
    sections: [
      {
        id: 'intro-columns',
        type: 'columns',
        design: {
          layout: { base: { proportions: [1, 1.4], gap: 3 }, mobile: { proportions: [1], gap: 1 } },
        },
        cells: [
          {
            sections: [
              {
                id: 'intro-text',
                type: 'text',
                title: 'Thoughtful by design.',
                paragraphs: [
                  'A fictional collection created to demonstrate a complete, configurable storefront engine.',
                ],
              },
            ],
          },
          {
            sections: [
              {
                id: 'intro-gallery',
                type: 'gallery',
                title: 'A closer look',
                lightbox: true,
                items: catalog.products
                  .slice(0, 3)
                  .map((p) => ({ src: p.images[0], alt: p.name, caption: p.name })),
                design: { layout: { base: { columns: 3 }, mobile: { columns: 1 } } },
              },
            ],
          },
        ],
      },
      {
        id: 'quotes',
        type: 'testimonials',
        title: 'Demo perspectives',
        items: [
          {
            quote: 'Thoughtful details make an everyday difference.',
            name: 'Fictional demo customer',
            role: 'Illustrative testimonial',
          },
          {
            quote: 'A simple, considered way to explore.',
            name: 'Fictional demo reviewer',
            role: 'Illustrative testimonial',
          },
        ],
        design: { layout: { base: { columns: 2 }, mobile: { columns: 1 } } },
      },
      {
        id: 'brands',
        type: 'brand-logos',
        title: 'The ORBIT collection',
        items: catalog.categories.slice(0, 3).map((c) => ({ name: c.name, image: c.image })),
      },
      {
        id: 'comparison',
        type: 'comparison-table',
        title: 'Find your fit',
        columns: ['Everyday', 'Studio'],
        rows: [
          { label: 'Compact design', values: [true, false] },
          { label: 'Focus', values: ['On the move', 'At your desk'] },
        ],
      },
      {
        id: 'film',
        type: 'video',
        title: 'A moment of focus',
        source: { provider: 'youtube', id: 'aqz-KE-bpKQ' },
        poster: image,
        transcript:
          'This sample links to the open movie Big Buck Bunny to demonstrate video embedding. It does not depict an ORBIT product.',
      },
      {
        id: 'promotions',
        type: 'promotional-collections',
        title: 'Explore a new perspective',
        items: [
          {
            collectionId: 'sale',
            title: 'A considered offer',
            image,
            imageAlt: catalog.products[0].name,
            link: {
              label: 'Explore offers',
              destination: { kind: 'system', route: 'catalog', query: { collection: 'sale' } },
            },
            preview: true,
          },
        ],
      },
    ],
  })
  config.pages.push({
    id: 'faq',
    title: 'Good to know.',
    paths: { 'en-US': '/faq' },
    sections: [
      {
        id: 'faq-list',
        type: 'faq',
        title: 'Questions, answered.',
        items: [
          {
            question: 'Is this a real store?',
            answer:
              'No. This is a fictional storefront. Mock checkout never sends an order or collects payment.',
          },
          {
            question: 'Can these layouts change?',
            answer:
              'Every page, section and supported design setting is supplied through JSON configuration.',
          },
        ],
      },
    ],
  })
  config.navigation = [
    {
      label: { values: { 'en-US': 'Shop', ar: 'تسوّق' } },
      destination: { kind: 'system', route: 'catalog' },
    },
    {
      label: { values: { 'en-US': 'Experience', ar: 'التجربة' } },
      destination: { kind: 'page', pageId: 'experience' },
    },
    {
      label: { values: { 'en-US': 'Our story', ar: 'قصتنا' } },
      destination: { kind: 'page', pageId: 'story' },
    },
    {
      label: { values: { 'en-US': 'Contact', ar: 'تواصل معنا' } },
      destination: { kind: 'page', pageId: 'contact' },
    },
  ]
  function fixAssets(value) {
    if (Array.isArray(value)) return value.map(fixAssets)
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        ['image', 'logo', 'src', 'poster'].includes(key) &&
        typeof v === 'string' &&
        v.startsWith('images/')
          ? '../../' + v
          : fixAssets(v),
      ]),
    )
  }
  config.pages.forEach((page) => {
    page.paths.ar ??= page.paths['en-US']
  })
  config.commerce = {
    product: { gallery: 'thumbnails', relatedBy: 'category', related: { inStock: true, limit: 4 } },
    products: { [catalog.products[2].id]: { gallery: 'rail', stickySummary: false } },
    category: { columns: 3, showImage: true },
    categories: {
      audio: {
        columns: 4,
        showImage: true,
        before: [
          {
            id: 'audio-intro',
            type: 'text',
            title: { values: { 'en-US': 'A world of sound.', ar: 'عالم من الصوت.' } },
            paragraphs: [
              {
                values: {
                  'en-US': 'Explore our fictional audio collection.',
                  ar: 'اكتشف مجموعتنا الصوتية الخيالية.',
                },
              },
            ],
          },
        ],
      },
    },
  }
  const finalConfig = fixAssets(bilingual(config))
  const check = validateStoreConfig(finalConfig, { ...catalog })
  if (!check.ok) throw new Error(JSON.stringify(check.diagnostics, null, 2))
  await writeFile(
    'public/stores/examples/engine-v2.json',
    JSON.stringify(finalConfig, null, 2) + '\n',
  )
  await writeFile('public/catalogs/engine-v2.json', JSON.stringify(catalog, null, 2) + '\n')
  await writeFile(
    'public/examples/engine-v2.json',
    JSON.stringify(
      {
        mode: 'mock',
        configUrl: '../stores/examples/engine-v2.json',
        catalogUrl: '../catalogs/engine-v2.json',
      },
      null,
      2,
    ) + '\n',
  )
} finally {
  await server.close()
}
