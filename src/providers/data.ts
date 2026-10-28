import type { StorefrontEngine } from '../engine/registry'
import { z } from 'zod'
import { resolveMedia } from '../core/config/media'
import type { NormalizeOptions } from '../core/config/normalize'
import {
  categorySchema,
  configSchema,
  productSchema,
  type DataProvider,
  type OrderInput,
  type StoreData,
} from '../core/schema'

const catalogSchema = z.object({
  products: z.array(productSchema),
  categories: z.array(categorySchema),
})
const bootstrapSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('mock'),
    configUrl: z.string(),
    catalogUrl: z.string(),
    revision: z.string().optional(),
  }),
  z.object({
    mode: z.literal('api'),
    revision: z.string().optional(),
    configUrl: z.string(),
    catalogUrl: z.string(),
    productUrl: z.string(),
    categoryUrl: z.string().optional(),
    searchUrl: z.string().optional(),
    ordersUrl: z.string(),
    queryUrl: z.string().optional(),
    resolveUrl: z.string().optional(),
    routesUrl: z.string().optional(),
    catalogCoverage: z.enum(['complete', 'partial']).default('partial'),
  }),
])

export async function readJson(
  url: string,
  signal?: AbortSignal,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  if (!response.ok) throw new Error(`Request failed (${response.status}). Please try again.`)
  return response.json()
}

async function validateStore(
  config: unknown,
  catalog: unknown,
  options: NormalizeOptions = {},
): Promise<StoreData> {
  const parsedCatalog = catalogSchema.parse(catalog)
  const legacy = (config as { version?: number }).version === 1
  const normalized = legacy
    ? configSchema.parse(config)
    : (await import('../core/config/normalize')).normalizeStoreConfig(config, {
        ...options,
        ...parsedCatalog,
        registry: options.registry ?? (await import('../engine/installed')).installedEngine,
      })
  const data = { config: normalized, ...parsedCatalog }
  for (const field of ['id', 'slug'] as const) {
    if (new Set(data.products.map((p) => p[field])).size !== data.products.length)
      throw new Error(`Duplicate product ${field} in catalog.`)
  }
  for (const product of data.products) {
    if (new Set(product.variants.map((v) => v.id)).size !== product.variants.length)
      throw new Error('Duplicate variant IDs.')
    if (!data.categories.some((c) => c.id === product.categoryId))
      throw new Error('Unknown product category.')
  }
  // Fail early if regional formatting is invalid.
  new Intl.NumberFormat(data.config.locale, {
    style: 'currency',
    currency: data.config.currency,
  }).format(0)
  return data
}

export async function createProvider(
  signal?: AbortSignal,
  engine?: StorefrontEngine,
): Promise<DataProvider> {
  const bootstrapUrl =
    import.meta.env.VITE_BOOTSTRAP_URL || `${import.meta.env.BASE_URL}storefront.json`
  const rawBootstrap = await readJson(bootstrapUrl, signal)
  const mode = String((rawBootstrap as { mode?: string }).mode)
  const extension = !['mock', 'api'].includes(mode)
    ? (engine ?? (await import('../engine/installed')).installedEngine).provider(mode)
    : undefined
  if (extension) return extension.create(extension.schema.parse(rawBootstrap))
  const bootstrap = bootstrapSchema.parse(rawBootstrap)
  const resolve = (url: string) => new URL(url, new URL(bootstrapUrl, document.baseURI)).href
  let currentStore: StoreData | undefined
  let mediaBase: string | undefined
  const normalizeMedia = (raw: unknown) =>
    currentStore?.config.engine && mediaBase ? resolveMedia(raw, mediaBase) : raw
  const cacheKey = (slug: string, locale = currentStore?.config.locale ?? 'en-US') =>
    locale + '|' + slug
  const cache = new Map<string, z.infer<typeof productSchema>>()
  const orders = new Map<string, { id: string; status: 'demo'; message: string }>()
  const provider: DataProvider = {
    mode: bootstrap.mode,
    capabilities: {
      catalog: bootstrap.mode === 'mock' ? 'complete' : bootstrap.catalogCoverage,
      queries: bootstrap.mode === 'mock' || !!bootstrap.queryUrl,
      routeEnumeration: bootstrap.mode === 'mock' || !!bootstrap.routesUrl,
    },
    async loadStore(signal) {
      const [config, originalCatalog] = await Promise.all([
        readJson(resolve(bootstrap.configUrl), signal),
        readJson(resolve(bootstrap.catalogUrl), signal),
      ])
      let catalog = originalCatalog
      const rawConfig = config as { version?: number; routing?: { basePath?: string } }
      mediaBase = new URL(
        rawConfig.version === 2 ? (rawConfig.routing?.basePath ?? '/') : import.meta.env.BASE_URL,
        document.baseURI,
      ).href
      if (bootstrap.mode === 'api' && rawConfig.version === 2) {
        const parsed = catalogSchema.parse(catalog)
        const references = (await import('../core/config/references'))
          .entityReferences(config)
          .filter((ref) =>
            ref.kind === 'product'
              ? !parsed.products.some((p) => p.id === ref.id)
              : !parsed.categories.some((c) => c.id === ref.id),
          )
        const context = {
          storeId: String((config as { storeId: string }).storeId),
          locale: (config as { i18n: { defaultLocale: string } }).i18n.defaultLocale,
          currency: String((config as { currency: string }).currency),
        }
        for (let i = 0; i < references.length; i += 25) {
          const batch = references.slice(i, i + 25)
          if (provider.resolveEntities) {
            const resolved = await provider.resolveEntities(batch, context, signal)
            for (const p of resolved.products)
              if (!parsed.products.some((existing) => existing.id === p.id)) parsed.products.push(p)
            for (const c of resolved.categories)
              if (!parsed.categories.some((existing) => existing.id === c.id))
                parsed.categories.push(c)
          } else {
            for (const ref of batch) {
              const endpoint = ref.kind === 'product' ? bootstrap.productUrl : bootstrap.categoryUrl
              if (!endpoint) continue
              const url = new URL(resolve(endpoint))
              url.searchParams.set('id', ref.id)
              const response = await readJson(url.href, signal)
              if (response === null) continue
              if (ref.kind === 'product') {
                const item = productSchema.parse(response)
                if (item.id !== ref.id) throw new Error('Unexpected product reference')
                parsed.products.push(item)
              } else {
                const item = categorySchema.parse(response)
                if (item.id !== ref.id) throw new Error('Unexpected category reference')
                parsed.categories.push(item)
              }
            }
          }
        }
        catalog = parsed
      }
      currentStore = await validateStore(
        config,
        rawConfig.version === 2 ? resolveMedia(catalog, mediaBase) : catalog,
        {
          mode: bootstrap.mode,
          configUrl: resolve(bootstrap.configUrl),
          registry: engine,
          catalogCoverage: bootstrap.mode === 'mock' ? 'complete' : bootstrap.catalogCoverage,
        },
      )
      if (bootstrap.revision) {
        const bytes = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(JSON.stringify({ config, catalog: originalCatalog })),
        )
        currentStore.revision = [...new Uint8Array(bytes)]
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 16)
      }
      if (bootstrap.mode === 'api') {
        // Restore products outside the featured catalog when reopening a saved bag.
        let ids: string[] = []
        try {
          const lines: unknown = JSON.parse(
            localStorage.getItem(`electroerp:cart:${currentStore.config.storeId}`) || '[]',
          )
          if (Array.isArray(lines))
            ids = [
              ...new Set(
                lines
                  .map((line) => line?.productId)
                  .filter((id): id is string => typeof id === 'string'),
              ),
            ].slice(0, 50)
        } catch {
          /* Corrupt storage is treated as an empty bag. */
        }
        const restored = await Promise.all(
          ids
            .filter((id) => !currentStore!.products.some((p) => p.id === id))
            .map(async (id) => {
              const url = new URL(resolve(bootstrap.productUrl))
              url.searchParams.set('id', id)
              const raw = await readJson(url.href, signal)
              if (raw === null) return null
              const product = productSchema.parse(normalizeMedia(raw))
              if (product.id !== id)
                throw new Error('Product lookup returned an unexpected product.')
              return product
            }),
        )
        currentStore.products.push(...restored.filter((p) => p !== null))
      }
      currentStore.products.forEach((p) => cache.set(cacheKey(p.slug), p))
      return currentStore
    },
    async placeOrder(input: OrderInput, signal) {
      if (bootstrap.mode === 'api') {
        const response = await readJson(resolve(bootstrap.ordersUrl), signal, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': input.idempotencyKey },
          body: JSON.stringify(input),
        })
        return z
          .object({ id: z.string().min(1), status: z.literal('received'), message: z.string() })
          .parse(response)
      }
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const existing = orders.get(input.idempotencyKey)
      if (existing) return existing
      if (!currentStore || input.storeId !== currentStore.config.storeId || !input.items.length)
        throw new Error('Your bag is empty or the store is unavailable.')
      for (const item of input.items) {
        const variant = currentStore.products
          .find((p) => p.id === item.productId)
          ?.variants.find((v) => v.id === item.variantId)
        if (
          !variant ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > variant.stock
        )
          throw new Error('An item is no longer available in the requested quantity.')
      }
      const result = {
        id: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: 'demo' as const,
        message: 'This is a demonstration. No payment was collected and no order was sent.',
      }
      orders.set(input.idempotencyKey, result)
      return result
    },
  }
  if (bootstrap.mode === 'api' && bootstrap.queryUrl) {
    provider.queryProducts = async (query, context, signal) => {
      const response = await readJson(resolve(bootstrap.queryUrl!), signal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, context }),
      })
      const parsed = z
        .object({
          items: z.array(productSchema).max(100),
          variants: z.record(z.string(), z.string()),
          nextCursor: z.string().optional(),
          total: z.number().int().nonnegative().optional(),
          revision: z.string().optional(),
        })
        .parse(normalizeMedia(response))
      for (const product of parsed.items) {
        if (!product.variants.some((v) => v.id === parsed.variants[product.id]))
          throw new Error('Collection response contains an invalid qualifying variant')
        cache.set(cacheKey(product.slug, context.locale), product)
      }
      return parsed
    }
  }
  if (bootstrap.mode === 'api' && bootstrap.resolveUrl)
    provider.resolveEntities = async (references, context, signal) =>
      catalogSchema.parse(
        await readJson(resolve(bootstrap.resolveUrl!), signal, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ references, context }),
        }),
      )
  if (bootstrap.mode === 'api' && bootstrap.routesUrl)
    provider.listIndexableRoutes = async (context, cursor, signal) => {
      const url = new URL(resolve(bootstrap.routesUrl!))
      url.searchParams.set('locale', context.locale)
      if (cursor) url.searchParams.set('cursor', cursor)
      return catalogSchema
        .extend({ nextCursor: z.string().optional(), revision: z.string().optional() })
        .parse(await readJson(url.href, signal))
    }
  if (bootstrap.mode === 'api') {
    provider.getProduct = async (slug, signal, context) => {
      const key = cacheKey(slug, context?.locale)
      if (cache.has(key) && !currentStore?.config.engine) return cache.get(key)
      const url = new URL(resolve(bootstrap.productUrl))
      url.searchParams.set('slug', slug)
      if (context) url.searchParams.set('locale', context.locale)
      const raw = await readJson(url.href, signal)
      if (raw === null) return undefined
      const product = productSchema.parse(normalizeMedia(raw))
      if (product.slug !== slug) throw new Error('Product lookup returned an unexpected product.')
      cache.set(key, product)
      return product
    }
  }
  if (bootstrap.mode === 'api' && bootstrap.searchUrl) {
    provider.searchProducts = async (query, signal, context) => {
      const url = new URL(resolve(bootstrap.searchUrl!))
      url.searchParams.set('q', query)
      if (context) url.searchParams.set('locale', context.locale)
      url.searchParams.set('limit', '24')
      const products = z
        .array(productSchema)
        .parse(normalizeMedia(await readJson(url.href, signal)))
      products.forEach((p) => cache.set(cacheKey(p.slug, context?.locale), p))
      return products
    }
  }
  if (bootstrap.mode === 'api' && bootstrap.categoryUrl)
    provider.getCategory = async (slug, signal, context) => {
      const url = new URL(resolve(bootstrap.categoryUrl!))
      url.searchParams.set('slug', slug)
      if (context) url.searchParams.set('locale', context.locale)
      const raw = await readJson(url.href, signal)
      if (raw === null) return undefined
      const category = categorySchema.parse(normalizeMedia(raw))
      if ((category.slug ?? category.id) !== slug) throw new Error('Unexpected category lookup')
      return category
    }
  return provider
}
