import { z } from 'zod'
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
  z.object({ mode: z.literal('mock'), configUrl: z.string(), catalogUrl: z.string() }),
  z.object({
    mode: z.literal('api'),
    configUrl: z.string(),
    catalogUrl: z.string(),
    productUrl: z.string(),
    searchUrl: z.string().optional(),
    ordersUrl: z.string(),
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

function validateStore(config: unknown, catalog: unknown): StoreData {
  const data = { config: configSchema.parse(config), ...catalogSchema.parse(catalog) }
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

export async function createProvider(signal?: AbortSignal): Promise<DataProvider> {
  const bootstrapUrl =
    import.meta.env.VITE_BOOTSTRAP_URL || `${import.meta.env.BASE_URL}storefront.json`
  const bootstrap = bootstrapSchema.parse(await readJson(bootstrapUrl, signal))
  const resolve = (url: string) => new URL(url, new URL(bootstrapUrl, document.baseURI)).href
  let currentStore: StoreData | undefined
  const cache = new Map<string, z.infer<typeof productSchema>>()
  const orders = new Map<string, { id: string; status: 'demo'; message: string }>()
  const provider: DataProvider = {
    mode: bootstrap.mode,
    async loadStore(signal) {
      const [config, catalog] = await Promise.all([
        readJson(resolve(bootstrap.configUrl), signal),
        readJson(resolve(bootstrap.catalogUrl), signal),
      ])
      currentStore = validateStore(config, catalog)
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
              const product = productSchema.parse(raw)
              if (product.id !== id)
                throw new Error('Product lookup returned an unexpected product.')
              return product
            }),
        )
        currentStore.products.push(...restored.filter((p) => p !== null))
      }
      currentStore.products.forEach((p) => cache.set(p.slug, p))
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
  if (bootstrap.mode === 'api') {
    provider.getProduct = async (slug, signal) => {
      if (cache.has(slug)) return cache.get(slug)
      const url = new URL(resolve(bootstrap.productUrl))
      url.searchParams.set('slug', slug)
      const raw = await readJson(url.href, signal)
      if (raw === null) return undefined
      const product = productSchema.parse(raw)
      if (product.slug !== slug) throw new Error('Product lookup returned an unexpected product.')
      cache.set(slug, product)
      return product
    }
  }
  if (bootstrap.mode === 'api' && bootstrap.searchUrl) {
    provider.searchProducts = async (query, signal) => {
      const url = new URL(resolve(bootstrap.searchUrl!))
      url.searchParams.set('q', query)
      url.searchParams.set('limit', '24')
      const products = z.array(productSchema).parse(await readJson(url.href, signal))
      products.forEach((p) => cache.set(p.slug, p))
      return products
    }
  }
  return provider
}
