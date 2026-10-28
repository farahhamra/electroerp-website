import { z } from 'zod'
import { createStorefrontEngine } from './registry'
import { sectionBaseV2 } from '../core/config/contracts'
import { normalizeStoreConfig } from '../core/config/normalize'
import { productSchema, categorySchema } from '../core/schema'
const fixtureSchema = z.strictObject({
  mode: z.literal('demo:fixture'),
  config: z.unknown(),
  products: z.array(productSchema),
  categories: z.array(categorySchema),
})
/** Trusted build-time composition root. Add/remove extension imports here. */
export const installedEngine = createStorefrontEngine({
  sections: [
    {
      type: 'demo:notice',
      version: 1,
      description: 'Illustrative custom section with its own settings schema',
      localizable: ['message'],
      schema: z.strictObject({
        ...sectionBaseV2,
        type: z.literal('demo:notice'),
        message: z.string().min(1).max(2000),
      }),
      load: () => import('../extensions/examples/notice'),
    },
  ],
  providers: [
    {
      id: 'demo:fixture',
      version: 1,
      schema: fixtureSchema,
      create: async (raw) => {
        const fixture = fixtureSchema.parse(raw)
        const data = {
          config: normalizeStoreConfig(fixture.config, {
            registry: installedEngine,
            products: fixture.products,
            categories: fixture.categories,
            mode: 'mock',
          }),
          products: fixture.products,
          categories: fixture.categories,
        }
        return {
          mode: 'mock',
          capabilities: { catalog: 'complete' },
          loadStore: async () => data,
          placeOrder: async () => ({
            id: 'DEMO-FIXTURE',
            status: 'demo',
            message: 'This fixture provider never sends an order.',
          }),
        }
      },
    },
  ],
})
