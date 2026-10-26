import { z } from 'zod'
import {
  benefitSchema,
  cardOverridesSchema,
  linkSchema,
  mediaOptions,
  presentationSchema,
  sectionBase,
  sortSchema,
} from './presentation'

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
export const sectionSchema = z.discriminatedUnion('type', [
  z.object({
    ...sectionBase,
    ...mediaOptions,
    type: z.literal('hero'),
    layout: z.enum(['template', 'split', 'centered']).default('template'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
    imageAlt: z.string(),
    cta: linkSchema,
    secondaryCta: linkSchema.optional(),
    footnote: z.string().optional(),
    imageLabel: z.string().optional(),
    edition: z.string().optional(),
    caption: z.string().optional(),
    companionCategoryIds: z.array(z.string()).max(2).optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('products'),
    layout: z.enum(['template', 'grid', 'rail']).default('template'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string().optional(),
    collectionId: z.string().optional(),
    categoryId: z.string().optional(),
    productIds: z.array(z.string()).optional(),
    inStockOnly: z.boolean().default(false),
    sort: sortSchema.default('featured'),
    limit: z.number().int().positive().max(24).default(4),
    columns: z.number().int().min(1).max(4).default(4),
    mobileColumns: z.union([z.literal(1), z.literal(2)]).default(2),
    card: cardOverridesSchema.optional(),
    cta: linkSchema.optional(),
    showCta: z.boolean().default(true),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('categories'),
    layout: z.enum(['template', 'grid', 'list']).default('template'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string().optional(),
    categoryIds: z.array(z.string()).optional(),
    columns: z.number().int().min(1).max(4).default(3),
  }),
  z.object({
    ...sectionBase,
    ...mediaOptions,
    type: z.literal('banner'),
    layout: z.enum(['template', 'split', 'centered']).default('template'),
    eyebrow: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    cta: linkSchema,
    secondaryCta: linkSchema.optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('text'),
    layout: z.enum(['centered', 'split']).default('centered'),
    eyebrow: z.string().default(''),
    title: z.string(),
    paragraphs: z.array(z.string()).min(1),
    cta: linkSchema.optional(),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('faq'),
    eyebrow: z.string().default('GOOD TO KNOW'),
    title: z.string(),
    items: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).min(1),
  }),
  z.object({
    ...sectionBase,
    type: z.literal('benefits'),
    items: z.array(benefitSchema).optional(),
  }),
])
export const configSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal(1),
  storeId: z.string().min(1),
  template: z.string().min(1),
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    logo: z.string().optional(),
    logoWidth: z.number().min(60).max(280).default(160),
    showSymbol: z.boolean().default(true),
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
    contentWidth: z.number().min(960).max(1600).default(1280),
    bodySize: z.number().min(14).max(20).default(15),
    headingWeight: z.number().int().min(300).max(800).optional(),
    buttonShape: z.enum(['template', 'square', 'rounded', 'pill']).default('template'),
    buttonStyle: z.enum(['solid', 'outline']).default('solid'),
    motion: z.enum(['full', 'reduced']).default('full'),
  }),
  presentation: presentationSchema,
  announcement: z.string().optional(),
  navigation: z.array(linkSchema.extend({ children: z.array(linkSchema).optional() })),
  footer: z.object({
    text: z.string(),
    links: z.array(linkSchema),
    eyebrow: z.string().optional(),
    categoriesTitle: z.string().optional(),
    linksTitle: z.string().optional(),
    cta: linkSchema.optional(),
    columns: z.array(z.object({ title: z.string(), links: z.array(linkSchema) })).default([]),
    socialLinks: z.array(linkSchema).default([]),
    copyright: z.string().optional(),
  }),
  benefits: z.array(benefitSchema),
  sections: z
    .array(sectionSchema)
    .refine(
      (sections) => new Set(sections.map((s) => s.id)).size === sections.length,
      'Section IDs must be unique',
    ),
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
