import { z } from 'zod'

const amount = z.number().int().nonnegative()
export const variantSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  options: z.record(z.string(), z.string()),
  price: amount,
  compareAtPrice: amount.optional(),
  stock: z.number().int().nonnegative(),
  image: z.string().optional(),
})
export const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string(),
  model: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  collectionIds: z.array(z.string()).default([]),
  description: z.string(),
  details: z.array(z.string()),
  images: z.array(z.string()).min(1),
  variants: z.array(variantSchema).min(1),
  badge: z.string().optional(),
})
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string(),
})
const linkSchema = z.object({
  label: z.string(),
  href: z
    .string()
    .refine((v) => /^\/(?!\/)|^https:\/\//.test(v), 'Use a relative route or HTTPS URL'),
})
export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('hero'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    cta: linkSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal('products'),
    eyebrow: z.string(),
    title: z.string(),
    collectionId: z.string().optional(),
    limit: z.number().int().positive().max(24).default(4),
  }),
  z.object({
    id: z.string(),
    type: z.literal('categories'),
    eyebrow: z.string(),
    title: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('banner'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    cta: linkSchema,
  }),
])
export const configSchema = z.object({
  version: z.literal(1),
  storeId: z.string().min(1),
  template: z.string().min(1),
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    logo: z.string().optional(),
  }),
  locale: z.string(),
  currency: z.string().length(3),
  currencyDecimals: z.number().int().min(0).max(3),
  theme: z.object({
    background: z.string().regex(/^#[\da-fA-F]{6}$/),
    foreground: z.string().regex(/^#[\da-fA-F]{6}$/),
    accent: z.string().regex(/^#[\da-fA-F]{6}$/),
    accentText: z.string().regex(/^#[\da-fA-F]{6}$/),
    surface: z.string().regex(/^#[\da-fA-F]{6}$/),
    muted: z.string().regex(/^#[\da-fA-F]{6}$/),
    headingFont: z.string(),
    bodyFont: z.string(),
    radius: z.number().min(0).max(32),
  }),
  announcement: z.string().optional(),
  navigation: z.array(linkSchema.extend({ children: z.array(linkSchema).optional() })),
  footer: z.object({ text: z.string(), links: z.array(linkSchema) }),
  benefits: z.array(z.object({ title: z.string(), description: z.string() })),
  sections: z.array(sectionSchema),
  checkout: z.object({
    countries: z.array(z.string()).min(1),
    shippingFee: amount,
    freeShippingThreshold: amount.optional(),
    notice: z.string(),
  }),
})
export type StoreConfig = z.infer<typeof configSchema>
export type Product = z.infer<typeof productSchema>
export type Variant = z.infer<typeof variantSchema>
export type Category = z.infer<typeof categorySchema>
export type Section = z.infer<typeof sectionSchema>
export interface Customer {
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
}
export interface CartLine {
  productId: string
  variantId: string
  quantity: number
}
export interface OrderInput {
  storeId: string
  items: CartLine[]
  customer: Customer
  idempotencyKey: string
}
export interface OrderResult {
  id: string
  status: 'demo' | 'received'
  message: string
}
export interface StoreData {
  config: StoreConfig
  products: Product[]
  categories: Category[]
}
export interface DataProvider {
  mode: 'mock' | 'api'
  loadStore(signal?: AbortSignal): Promise<StoreData>
  searchProducts?(query: string, signal?: AbortSignal): Promise<Product[]>
  getProduct?(slug: string, signal?: AbortSignal): Promise<Product | undefined>
  placeOrder(input: OrderInput, signal?: AbortSignal): Promise<OrderResult>
}
