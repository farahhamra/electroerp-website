import { z } from 'zod'
import { configSchema, sectionSchema } from '../schema'

export const idSchema = z
  .string()
  .regex(/^[a-zA-Z][\w:-]*$/)
  .max(100)
export const colorSchema = z.string().regex(/^#[\da-fA-F]{6}$/)
export const safeUrl = z
  .string()
  .max(2048)
  .refine((s) => {
    if (/[\u0000-\u001f<>"\\]/.test(s) || s.startsWith('//')) return false
    if (/^https:\/\//.test(s)) {
      try {
        return new URL(s).protocol === 'https:'
      } catch {
        return false
      }
    }
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(s)) return true
    return !s.includes(':') && /^[a-zA-Z0-9_./-]/.test(s)
  }, 'Use a local asset or HTTPS URL')
export const textSchema = z.string().max(20000)
export const destinationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('page'), pageId: idSchema }),
  z.strictObject({ kind: z.literal('product'), productId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('category'), categoryId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('section'), pageId: idSchema, sectionId: idSchema }),
  z.strictObject({
    kind: z.literal('system'),
    route: z.enum(['catalog', 'cart', 'checkout']),
    query: z
      .partialRecord(
        z.enum(['q', 'category', 'brand', 'collection', 'stock', 'price', 'sort']),
        z.string(),
      )
      .optional(),
  }),
  z.strictObject({
    kind: z.literal('external'),
    url: z.url().refine((s) => s.startsWith('https://')),
  }),
  z.strictObject({ kind: z.literal('path'), path: z.string().regex(/^\/(?!\/)/) }),
  ...(['phone', 'email', 'whatsapp'] as const).map((kind) =>
    z.strictObject({
      kind: z.literal(kind),
      value: z.string().min(1).optional(),
      contactId: idSchema.optional(),
      message: z.string().max(1000).optional(),
    }),
  ),
])
const renderedLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().refine((v) => !v || /^(\/(?!\/)|https:\/\/|tel:\+|mailto:)/.test(v)),
})
export const engineLinkSchema = z.strictObject({
  label: z.string().min(1).max(500),
  destination: destinationSchema,
})
export const responsive = <T extends z.ZodType>(schema: T) =>
  z.strictObject({
    base: schema.optional(),
    mobile: schema.optional(),
    tablet: schema.optional(),
    desktop: schema.optional(),
  })
export const typeStyleSchema = z.strictObject({
  font: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
  size: z.number().min(0.625).max(12).optional(),
  weight: z.number().int().min(100).max(900).optional(),
  lineHeight: z.number().min(0.9).max(3).optional(),
  letterSpacing: z.number().min(-0.15).max(0.5).optional(),
  transform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
})
export const typographySchema = z.partialRecord(
  z.enum([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'body',
    'lead',
    'caption',
    'eyebrow',
    'button',
    'navigation',
    'input',
  ]),
  responsive(typeStyleSchema),
)
export const layoutValueSchema = z.strictObject({
  columns: z.number().int().min(1).max(6).optional(),
  proportions: z.array(z.number().min(0.1).max(10)).min(1).max(6).optional(),
  gap: z.number().min(0).max(12).optional(),
  paddingBlock: z.number().min(0).max(20).optional(),
  paddingInline: z.number().min(0).max(12).optional(),
  maxWidth: z.number().min(16).max(120).optional(),
  align: z.enum(['start', 'center', 'end']).optional(),
  verticalAlign: z.enum(['start', 'center', 'end', 'stretch']).optional(),
  visible: z.boolean().optional(),
  imageRatio: z.number().min(0.25).max(4).optional(),
  imageSide: z.enum(['start', 'end']).optional(),
})
export const tokensSchema = z.strictObject({
  palette: z
    .partialRecord(
      z.enum([
        'background',
        'foreground',
        'surface',
        'muted',
        'accent',
        'accentText',
        'border',
        'focus',
      ]),
      colorSchema,
    )
    .optional(),
  spacing: z
    .partialRecord(z.enum(['xs', 'sm', 'md', 'lg', 'xl']), z.number().min(0).max(12))
    .optional(),
  radius: z.number().min(0).max(32).optional(),
  shadow: z.enum(['none', 'soft', 'raised']).optional(),
  typography: typographySchema.optional(),
  components: z
    .partialRecord(
      z.enum(['button', 'input', 'card', 'dropdown', 'header', 'footer']),
      z.strictObject({
        radius: z.number().min(0).max(32).optional(),
        background: colorSchema.optional(),
        color: colorSchema.optional(),
        border: colorSchema.optional(),
        padding: z.number().min(0).max(4).optional(),
        hoverBackground: colorSchema.optional(),
        focusColor: colorSchema.optional(),
        disabledOpacity: z.number().min(0.2).max(1).optional(),
      }),
    )
    .optional(),
})
export const designSchema = z.strictObject({
  layout: responsive(layoutValueSchema).optional(),
  tokens: tokensSchema.optional(),
  background: z
    .strictObject({
      color: colorSchema.optional(),
      image: safeUrl.optional(),
      overlay: z.number().min(0).max(0.85).optional(),
      position: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center'),
    })
    .optional(),
})
export const seoSchema = z.strictObject({
  title: textSchema.optional(),
  description: textSchema.optional(),
  canonical: z
    .url()
    .refine((s) => s.startsWith('https://'))
    .optional(),
  image: safeUrl.optional(),
  imageAlt: textSchema.optional(),
  imageWidth: z.number().int().positive().optional(),
  imageHeight: z.number().int().positive().optional(),
  index: z.boolean().default(true),
  follow: z.boolean().default(true),
})
export const nodeSchema = z.record(z.string(), z.unknown())
export const pageSchema = z.strictObject({
  id: idSchema,
  title: textSchema,
  paths: z.record(
    z.string(),
    z
      .string()
      .max(2000)
      .regex(/^\/(?!\/)[^?#]*$/),
  ),
  enabled: z.boolean().default(true),
  heading: z.enum(['title', 'hero']).default('title'),
  sections: z.array(nodeSchema).max(100),
  design: designSchema.optional(),
  header: z.boolean().default(true),
  footer: z.boolean().default(true),
  seo: seoSchema.optional(),
})
export const intervalSchema = z.strictObject({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  nextDay: z.boolean().default(false),
})
export const dayHoursSchema = z.strictObject({
  closed: z.boolean().default(false),
  allDay: z.boolean().default(false),
  intervals: z.array(intervalSchema).max(6).default([]),
})
export const businessSchema = z.strictObject({
  name: textSchema.optional(),
  legalName: textSchema.optional(),
  contacts: z
    .array(
      z.strictObject({
        id: idSchema,
        kind: z.enum(['phone', 'email', 'whatsapp']),
        label: textSchema,
        value: z.string().min(1).max(200),
      }),
    )
    .max(30)
    .default([]),
  socials: z.array(engineLinkSchema).max(20).default([]),
  locations: z
    .array(
      z.strictObject({
        id: idSchema,
        label: textSchema,
        address: z.strictObject({
          street: textSchema,
          city: textSchema,
          region: textSchema.optional(),
          postalCode: textSchema.optional(),
          country: textSchema,
        }),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        mapUrl: z
          .url()
          .refine((s) => s.startsWith('https://'))
          .optional(),
        timeZone: z.string().refine((s) => {
          try {
            new Intl.DateTimeFormat('en', { timeZone: s })
            return true
          } catch {
            return false
          }
        }, 'Use an IANA time zone'),
        hours: z
          .partialRecord(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']), dayHoursSchema)
          .default({}),
        exceptions: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dayHoursSchema).default({}),
      }),
    )
    .max(30)
    .default([]),
})
export const querySchema = z
  .strictObject({
    productIds: z.array(z.string()).max(500).optional(),
    categoryIds: z.array(z.string()).max(50).optional(),
    brands: z.array(z.string()).max(50).optional(),
    collectionIds: z.array(z.string()).max(50).optional(),
    minPrice: z.number().int().nonnegative().optional(),
    maxPrice: z.number().int().nonnegative().optional(),
    inStock: z.boolean().optional(),
    discounted: z.boolean().optional(),
    createdAfter: z.iso.datetime().optional(),
    sort: z
      .enum(['featured', 'price-low', 'price-high', 'name', 'newest', 'discount'])
      .default('featured'),
    limit: z.number().int().min(1).max(100).default(12),
    cursor: z.string().max(500).optional(),
    excludeIds: z.array(z.string()).max(100).optional(),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    path: ['maxPrice'],
    message: 'Maximum price must be at least minimum price',
  })
export const blockTypes = [
  'gallery',
  'title',
  'price',
  'variants',
  'availability',
  'purchase',
  'description',
  'specifications',
  'delivery',
  'related',
] as const
export const productLayoutSchema = z.strictObject({
  gallery: z.enum(['thumbnails', 'stacked', 'rail']).default('thumbnails'),
  stickySummary: z.boolean().default(false),
  regions: z
    .strictObject({
      media: z.array(z.enum(blockTypes)).default(['gallery']),
      summary: z
        .array(z.enum(blockTypes))
        .default([
          'title',
          'price',
          'description',
          'variants',
          'availability',
          'purchase',
          'delivery',
        ]),
      details: z.array(z.enum(blockTypes)).default(['specifications', 'related']),
    })
    .prefault({}),
  design: designSchema.optional(),
  related: querySchema.optional(),
  relatedBy: z.enum(['category', 'brand', 'query']).default('category'),
})
export const categoryLayoutSchema = z.strictObject({
  before: z.array(nodeSchema).max(20).default([]),
  after: z.array(nodeSchema).max(20).default([]),
  showImage: z.boolean().default(true),
  columns: z.number().int().min(1).max(4).optional(),
  query: querySchema.optional(),
})
export const i18nSchema = z.strictObject({
  defaultLocale: z.string().default('en-US'),
  fallbackLocale: z.string().optional(),
  locales: z
    .array(
      z.strictObject({
        code: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/),
        label: z.string().min(1),
        direction: z.enum(['ltr', 'rtl']).default('ltr'),
      }),
    )
    .min(1)
    .max(20),
  messages: z.record(z.string(), z.record(z.string(), z.string())).default({}),
})
export const routingSchema = z
  .strictObject({
    mode: z.enum(['hash', 'history']).default('hash'),
    basePath: z
      .string()
      .regex(/^\/(?!\/)/)
      .or(z.literal('/'))
      .default('/'),
    trailingSlash: z.enum(['always', 'never']).default('never'),
  })
  .prefault({})
const legacyShape = configSchema.shape
export const v2Schema = configSchema
  .omit({ version: true, sections: true, locale: true, navigation: true, theme: true })
  .extend({
    version: z.literal(2),
    theme: legacyShape.theme.extend({ tokens: tokensSchema.optional() }).strict(),
    i18n: i18nSchema,
    routing: routingSchema,
    pages: z.array(pageSchema).min(1).max(100),
    footer: legacyShape.footer.extend({
      business: z
        .strictObject({
          locationId: idSchema.optional(),
          contactIds: z.array(idSchema).optional(),
          showHours: z.boolean().default(true),
          showSocials: z.boolean().default(true),
        })
        .optional(),
      links: z.array(z.union([engineLinkSchema, renderedLinkSchema])),
      socialLinks: z.array(z.union([engineLinkSchema, renderedLinkSchema])).default([]),
      columns: z
        .array(
          z.object({
            title: textSchema,
            links: z.array(z.union([engineLinkSchema, renderedLinkSchema])),
          }),
        )
        .default([]),
      cta: z.union([engineLinkSchema, renderedLinkSchema]).optional(),
    }),
    navigation: z
      .array(engineLinkSchema.extend({ children: z.array(engineLinkSchema).optional() }))
      .max(30),
    business: businessSchema.prefault({}),
    collections: z.record(idSchema, querySchema).default({}),
    commerce: z
      .strictObject({
        product: productLayoutSchema.prefault({}),
        products: z.record(z.string(), productLayoutSchema).default({}),
        category: categoryLayoutSchema.prefault({}),
        categories: z.record(z.string(), categoryLayoutSchema).default({}),
      })
      .prefault({}),
    seo: seoSchema
      .extend({
        siteUrl: z
          .url()
          .refine((s) => s.startsWith('https://'))
          .optional(),
      })
      .prefault({}),
    extensions: z.record(z.string(), z.number().int().positive()).default({}),
  })
  .strict()
export const sectionBaseV2 = {
  id: idSchema,
  enabled: z.boolean().default(true),
  template: z.string().optional(),
  design: designSchema.optional(),
}
const content = {
  ...sectionBaseV2,
  title: textSchema.default(''),
  eyebrow: textSchema.default(''),
  description: textSchema.optional(),
}
const imageItem = z.strictObject({
  src: safeUrl,
  alt: textSchema,
  caption: textSchema.optional(),
  link: engineLinkSchema.optional(),
})
export const extraSectionSchemas: Record<string, z.ZodType> = {
  columns: z.strictObject({
    ...sectionBaseV2,
    type: z.literal('columns'),
    cells: z
      .array(z.strictObject({ sections: z.array(nodeSchema).max(100) }))
      .min(1)
      .max(6),
  }),
  'contact-details': z.strictObject({
    ...content,
    type: z.literal('contact-details'),
    locationId: idSchema.optional(),
    contactIds: z.array(idSchema).optional(),
    showHours: z.boolean().default(true),
    showSocials: z.boolean().default(true),
  }),
  map: z.strictObject({
    ...content,
    type: z.literal('map'),
    locationId: idSchema,
    embed: z.boolean().default(false),
    zoom: z.number().int().min(1).max(19).default(14),
    poster: safeUrl.optional(),
    height: z.number().int().min(200).max(800).default(400),
  }),
  gallery: z.strictObject({
    ...content,
    type: z.literal('gallery'),
    items: z.array(imageItem).min(1).max(50),
    layout: z.enum(['grid', 'rail']).default('grid'),
    lightbox: z.boolean().default(false),
  }),
  testimonials: z.strictObject({
    ...content,
    type: z.literal('testimonials'),
    items: z
      .array(
        z.strictObject({
          quote: textSchema,
          name: textSchema,
          role: textSchema.optional(),
          avatar: safeUrl.optional(),
          rating: z.number().int().min(1).max(5).optional(),
        }),
      )
      .min(1)
      .max(50),
  }),
  'brand-logos': z.strictObject({
    ...content,
    type: z.literal('brand-logos'),
    items: z
      .array(
        z.strictObject({ name: textSchema, image: safeUrl, link: engineLinkSchema.optional() }),
      )
      .min(1)
      .max(50),
  }),
  video: z.strictObject({
    ...content,
    type: z.literal('video'),
    source: z.discriminatedUnion('provider', [
      z.strictObject({ provider: z.literal('file'), url: safeUrl }),
      z.strictObject({
        provider: z.enum(['youtube', 'vimeo']),
        id: z
          .string()
          .regex(/^[\w-]+$/)
          .max(30),
      }),
    ]),
    poster: safeUrl.optional(),
    transcript: textSchema.optional(),
    tracks: z
      .array(z.strictObject({ src: safeUrl, language: z.string(), label: textSchema }))
      .default([]),
  }),
  'comparison-table': z.strictObject({
    ...content,
    type: z.literal('comparison-table'),
    columns: z.array(textSchema).min(1).max(10),
    rows: z
      .array(
        z.strictObject({
          label: textSchema,
          values: z.array(z.union([textSchema, z.boolean()])).max(10),
        }),
      )
      .min(1)
      .max(100),
  }),
  'promotional-collections': z.strictObject({
    ...content,
    type: z.literal('promotional-collections'),
    items: z
      .array(
        z.strictObject({
          collectionId: idSchema,
          title: textSchema,
          image: safeUrl,
          imageAlt: textSchema.default(''),
          link: engineLinkSchema,
          preview: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(12),
  }),
  collection: z.strictObject({
    ...content,
    type: z.literal('collection'),
    collectionId: idSchema.optional(),
    query: querySchema.optional(),
    empty: z.enum(['omit', 'message']).default('message'),
  }),
}
export const nativeSectionSchemas = Object.fromEntries(
  sectionSchema.options.map((schema) => [
    schema.shape.type.value,
    schema
      .extend({
        design: designSchema.optional(),
        ...('cta' in schema.shape
          ? {
              cta:
                'type' in schema.shape && ['hero', 'banner'].includes(schema.shape.type.value)
                  ? z.union([engineLinkSchema, renderedLinkSchema])
                  : z.union([engineLinkSchema, renderedLinkSchema]).optional(),
            }
          : {}),
        ...('secondaryCta' in schema.shape
          ? { secondaryCta: z.union([engineLinkSchema, renderedLinkSchema]).optional() }
          : {}),
      })
      .strict(),
  ]),
)
export type EngineSection = {
  id: string
  type: string
  enabled: boolean
  template?: string
  design?: z.infer<typeof designSchema>
  [key: string]: unknown
}
export type EnginePage = Omit<z.infer<typeof pageSchema>, 'sections'> & {
  sections: EngineSection[]
}
export type EngineConfig = Omit<z.infer<typeof v2Schema>, 'pages'> & {
  pages: EnginePage[]
  source: unknown
  diagnostics: Diagnostic[]
}
export type CollectionQuery = z.infer<typeof querySchema>
export type Design = z.infer<typeof designSchema>
export type Tokens = z.infer<typeof tokensSchema>
export type Business = z.infer<typeof businessSchema>
export type Diagnostic = {
  code: string
  severity: 'error' | 'warning' | 'info'
  path: (string | number)[]
  pointer: string
  message: string
  pageId?: string
  sectionId?: string
  relatedPaths?: (string | number)[][]
}
export type ValidationResult<T> =
  { ok: true; value: T; diagnostics: Diagnostic[] } | { ok: false; diagnostics: Diagnostic[] }
