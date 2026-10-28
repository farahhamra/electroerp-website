import type { StoreData } from '../schema'
import { pagePath, stripLocale, localePath, normalizePath } from '../routing/links'
export interface Head {
  title: string
  description: string
  canonical?: string
  robots: string
  image?: string
  imageAlt?: string
  imageWidth?: number
  imageHeight?: number
  type: string
  locale: string
  alternates: { locale: string; href: string }[]
  structured: unknown[]
}
export function publicUrl(path: string, origin: string, basePath = '/') {
  return new URL(
    /^https?:\/\//.test(path) || (basePath !== '/' && path.startsWith(basePath))
      ? path
      : basePath.replace(/\/$/, '') + '/' + path.replace(/^\//, ''),
    origin,
  ).href
}
export function buildHead(data: StoreData, pathname: string, search = ''): Head {
  const { config } = data,
    e = config.engine
  const head: Head = {
    title: `${config.brand.name} — ${config.brand.tagline}`,
    description: config.brand.description,
    robots: 'index,follow',
    type: 'website',
    locale: config.locale,
    alternates: [],
    structured: [],
  }
  if (!e) return head
  const locale = config.locale,
    path = stripLocale(pathname, e)
  const page = e.pages.find(
    (p) => p.enabled && normalizePath(pagePath(p, e, locale)) === normalizePath(pathname),
  )
  const products = data.products.map((p) => ({ ...p, ...p.translations?.[locale] })),
    categories = data.categories.map((c) => ({ ...c, ...c.translations?.[locale] }))
  const product = path.startsWith('/products/')
    ? products.find((p) => p.slug === decodeURIComponent(path.slice(10)))
    : undefined
  const category = path.startsWith('/categories/')
    ? categories.find((c) => (c.slug ?? c.id) === decodeURIComponent(path.slice(12)))
    : undefined
  const seo = { ...e.seo, ...page?.seo, ...product?.seo, ...category?.seo }
  head.title =
    seo.title ??
    (page
      ? page.title
      : product
        ? product.name
        : category
          ? category.name
          : path === '/catalog'
            ? config.presentation.catalog.title
            : head.title)
  head.description =
    seo.description ?? product?.description ?? category?.description ?? config.brand.description
  const noindex =
    seo.index === false ||
    /^\/(cart|checkout)(\/|$)/.test(path) ||
    (!page && !product && !category && path !== '/catalog') ||
    !!search
  head.robots = `${noindex ? 'noindex' : 'index'},${seo.follow === false ? 'nofollow' : 'follow'}`
  head.imageAlt = seo.imageAlt ?? product?.name ?? config.brand.name
  head.imageWidth = seo.imageWidth
  head.imageHeight = seo.imageHeight
  head.type = product ? 'product' : 'website'
  if (e.seo.siteUrl) {
    const absolute = (p: string) => publicUrl(p, e.seo.siteUrl!, e.routing.basePath)
    let canonicalPath = pathname
    const categoryQuery = new URLSearchParams(search).get('category')
    if (path === '/catalog' && categoryQuery) {
      const c = categories.find((c) => c.id === categoryQuery)
      if (c)
        canonicalPath = localePath(`/categories/${encodeURIComponent(c.slug ?? c.id)}`, e, locale)
    }
    head.canonical = seo.canonical ?? absolute(canonicalPath)
    const image = seo.image ?? product?.images[0] ?? category?.image ?? config.brand.logo
    if (image) head.image = absolute(image)
    if (!noindex) {
      head.alternates = e.i18n.locales.flatMap((l) => {
        if (page) return [{ locale: l.code, href: absolute(pagePath(page, e, l.code)) }]
        if (product) {
          const raw = data.products.find((p) => p.id === product.id)!
          if (l.code !== e.i18n.defaultLocale && !raw.translations?.[l.code]) return []
          return [
            {
              locale: l.code,
              href: absolute(
                localePath(
                  `/products/${encodeURIComponent(raw.translations?.[l.code]?.slug ?? raw.slug)}`,
                  e,
                  l.code,
                ),
              ),
            },
          ]
        }
        if (category) {
          const raw = data.categories.find((c) => c.id === category.id)!
          if (l.code !== e.i18n.defaultLocale && !raw.translations?.[l.code]) return []
          return [
            {
              locale: l.code,
              href: absolute(
                localePath(
                  `/categories/${encodeURIComponent(raw.translations?.[l.code]?.slug ?? raw.slug ?? raw.id)}`,
                  e,
                  l.code,
                ),
              ),
            },
          ]
        }
        return path === '/catalog'
          ? [{ locale: l.code, href: absolute(localePath('/catalog', e, l.code)) }]
          : []
      })
    }
    const organization = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': absolute('/') + '#organization',
      name: e.business.name ?? config.brand.name,
      url: absolute('/'),
      ...(config.brand.logo ? { logo: absolute(config.brand.logo) } : {}),
      ...(e.business.contacts.find((c) => c.kind === 'email')
        ? { email: e.business.contacts.find((c) => c.kind === 'email')!.value }
        : {}),
      ...(e.business.contacts.find((c) => c.kind === 'phone')
        ? { telephone: e.business.contacts.find((c) => c.kind === 'phone')!.value }
        : {}),
    }
    head.structured.push(organization)
    for (const location of e.business.locations)
      head.structured.push({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': absolute('/') + '#' + location.id,
        name: location.label,
        address: {
          '@type': 'PostalAddress',
          streetAddress: location.address.street,
          addressLocality: location.address.city,
          addressRegion: location.address.region,
          postalCode: location.address.postalCode,
          addressCountry: location.address.country,
        },
        ...(location.latitude !== undefined && location.longitude !== undefined
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: location.latitude,
                longitude: location.longitude,
              },
            }
          : {}),
      })
    if (product)
      head.structured.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.images.map(absolute),
        brand: { '@type': 'Brand', name: product.brand },
        model: product.model,
        offers: product.variants.map((v) => ({
          '@type': 'Offer',
          sku: v.sku,
          price: (v.price / 10 ** config.currencyDecimals).toFixed(config.currencyDecimals),
          priceCurrency: config.currency,
          availability: `https://schema.org/${v.stock > 0 ? 'InStock' : 'OutOfStock'}`,
          url: head.canonical,
        })),
      })
    if (path !== '/' && !noindex)
      head.structured.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: config.brand.name,
            item: absolute(localePath('/', e, locale)),
          },
          { '@type': 'ListItem', position: 2, name: head.title, item: head.canonical },
        ],
      })
  }
  return head
}
export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
export const safeJson = (input: unknown) =>
  JSON.stringify(input)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
export function headTags(head: Head) {
  const meta = (name: string, content: string, property = false) =>
    `<meta data-engine-head ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(content)}">`
  return (
    `<title>${escapeHtml(head.title)}</title>` +
    meta('description', head.description) +
    meta('robots', head.robots) +
    meta('og:title', head.title, true) +
    meta('og:description', head.description, true) +
    meta('og:type', head.type, true) +
    meta('og:locale', head.locale.replace('-', '_'), true) +
    meta('twitter:card', head.image ? 'summary_large_image' : 'summary') +
    (head.canonical
      ? `<link data-engine-head rel="canonical" href="${escapeHtml(head.canonical)}">` +
        meta('og:url', head.canonical, true)
      : '') +
    (head.image
      ? meta('og:image', head.image, true) +
        meta('twitter:image', head.image) +
        meta('og:image:alt', head.imageAlt ?? '', true) +
        (head.imageWidth ? meta('og:image:width', String(head.imageWidth), true) : '') +
        (head.imageHeight ? meta('og:image:height', String(head.imageHeight), true) : '')
      : '') +
    head.alternates
      .map(
        (a) =>
          `<link data-engine-head rel="alternate" hreflang="${escapeHtml(a.locale)}" href="${escapeHtml(a.href)}">`,
      )
      .join('') +
    head.structured
      .map(
        (value) =>
          `<script data-engine-head type="application/ld+json">${safeJson(value)}</script>`,
      )
      .join('')
  )
}
