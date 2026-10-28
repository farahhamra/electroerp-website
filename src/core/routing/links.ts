import type { z } from 'zod'
import type { EngineConfig, destinationSchema } from '../config/contracts'
import type { Product, Category } from '../schema'
export type Destination = z.infer<typeof destinationSchema>
export type LinkContext = {
  engine: EngineConfig
  locale: string
  products?: Product[]
  categories?: Category[]
}
export function normalizePath(path: string) {
  const decoded = decodeURIComponent(path)
  if (
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(decoded) ||
    decoded.split('/').some((p) => p === '.' || p === '..')
  )
    throw new Error('Unsafe internal route')
  return decoded.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
}
export function localePath(path: string, engine: EngineConfig, locale: string) {
  const separator = path.search(/[?#]/)
  const pathname = separator < 0 ? path : path.slice(0, separator)
  const suffix = separator < 0 ? '' : path.slice(separator)
  const normalized = normalizePath(pathname)
  const prefix = locale === engine.i18n.defaultLocale ? '' : `/${locale}`
  const result = prefix + (normalized === '/' ? '' : normalized) || '/'
  return result + (engine.routing.trailingSlash === 'always' && result !== '/' ? '/' : '') + suffix
}
export function routeLocale(path: string, engine: EngineConfig) {
  const first = path.split('/').filter(Boolean)[0]
  return engine.i18n.locales.find((l) => l.code === first)?.code ?? engine.i18n.defaultLocale
}
export function stripLocale(path: string, engine: EngineConfig) {
  const locale = routeLocale(path, engine)
  return normalizePath(
    locale !== engine.i18n.defaultLocale ? path.slice(locale.length + 1) || '/' : path,
  )
}
export function pagePath(
  page: EngineConfig['pages'][number],
  engine: EngineConfig,
  locale: string,
) {
  return localePath(page.paths[locale] ?? page.paths[engine.i18n.defaultLocale], engine, locale)
}
export function resolveDestination(target: Destination, ctx: LinkContext): string | undefined {
  const { engine, locale } = ctx
  switch (target.kind) {
    case 'page': {
      const page = engine.pages.find((p) => p.id === target.pageId && p.enabled)
      return page ? pagePath(page, engine, locale) : undefined
    }
    case 'section': {
      const page = engine.pages.find((p) => p.id === target.pageId && p.enabled)
      if (!page) return
      return (
        pagePath(page, engine, locale) +
        (engine.routing.mode === 'hash'
          ? `?section=${encodeURIComponent(target.sectionId)}`
          : `#${encodeURIComponent(target.sectionId)}`)
      )
    }
    case 'product': {
      const p = ctx.products?.find((p) => p.id === target.productId)
      return p ? localePath(`/products/${encodeURIComponent(p.slug)}`, engine, locale) : undefined
    }
    case 'category': {
      const c = ctx.categories?.find((c) => c.id === target.categoryId)
      return c
        ? localePath(`/categories/${encodeURIComponent(c.slug ?? c.id)}`, engine, locale)
        : undefined
    }
    case 'system': {
      const query = new URLSearchParams(target.query)
      return localePath('/' + target.route + (query.size ? `?${query}` : ''), engine, locale)
    }
    case 'path':
      return localePath(target.path, engine, locale)
    case 'external':
      return /^https:\/\//.test(target.url) ? target.url : undefined
    default: {
      const value =
        target.value ??
        engine.business.contacts.find((c) => c.id === target.contactId && c.kind === target.kind)
          ?.value
      if (!value || /[\r\n<>]/.test(value)) return
      if (target.kind === 'email')
        return /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(value) ? `mailto:${value}` : undefined
      const phone = value.replace(/[\s().-]/g, '')
      if (!/^\+[1-9]\d{6,14}$/.test(phone)) return
      return target.kind === 'phone'
        ? `tel:${phone}`
        : `https://wa.me/${phone.slice(1)}${target.message ? `?text=${encodeURIComponent(target.message)}` : ''}`
    }
  }
}
export function safeHref(href: string) {
  if (
    /^(https:\/\/|tel:\+[1-9]\d{6,14}$|mailto:[^\s@]+@[^\s@]+$)/.test(href) &&
    !/[\u0000-\u001f<>"\\]/.test(href)
  )
    return true
  try {
    return href.startsWith('/') && !href.startsWith('//') && !!normalizePath(href.split(/[?#]/)[0])
  } catch {
    return false
  }
}
