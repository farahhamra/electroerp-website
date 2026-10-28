import { installedEngine } from '../../engine/installed'
import { z } from 'zod'
import { productSchema, categorySchema, type StoreData, type DataProvider } from '../schema'
import { normalizeStoreConfig } from '../config/normalize'
export const snapshotSchema = z.strictObject({
  version: z.literal(1),
  config: z.unknown(),
  products: z.array(productSchema),
  categories: z.array(categorySchema),
  locale: z.string(),
  mode: z.enum(['mock', 'api']),
  revision: z.string().optional(),
})
export type Snapshot = z.infer<typeof snapshotSchema>
export function snapshotData(raw: unknown): { data: StoreData; provider: DataProvider } {
  const snapshot = snapshotSchema.parse(raw)
  const config = normalizeStoreConfig(snapshot.config, {
    locale: snapshot.locale,
    products: snapshot.products,
    categories: snapshot.categories,
    mode: snapshot.mode,
    registry: installedEngine,
  })
  const data: StoreData = {
    config,
    products: snapshot.products,
    categories: snapshot.categories,
    snapshot: true,
    revision: snapshot.revision,
  }
  const provider: DataProvider = {
    mode: snapshot.mode,
    capabilities: { catalog: 'complete' },
    loadStore: async () => data,
    placeOrder: async () => {
      throw new Error('The store is still connecting. Please try again.')
    },
  }
  return { data, provider }
}

export const snapshotReferenceSchema = z.strictObject({
  version: z.literal(1),
  configUrl: z.string().regex(/^\/(?!\/)/),
  catalogUrl: z.string().regex(/^\/(?!\/)/),
  locale: z.string(),
  mode: z.enum(['mock', 'api']),
  revision: z.string(),
})
