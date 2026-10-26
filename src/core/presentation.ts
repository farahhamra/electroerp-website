import { z } from 'zod'

export const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().regex(/^\/(?!\/)|^https:\/\//, 'Use a relative route or HTTPS URL'),
})
export const sortSchema = z.enum(['featured', 'price-low', 'price-high', 'name'])
export const benefitSchema = z.object({ title: z.string(), description: z.string() })
const cardFields = {
  imageRatio: z.enum(['template', 'square', 'portrait', 'landscape']),
  imageFit: z.enum(['template', 'contain', 'cover']),
  showCategory: z.boolean(),
  showBrand: z.boolean(),
  showOptions: z.boolean(),
  showBadge: z.boolean(),
  quickAdd: z.boolean(),
}
export const cardOverridesSchema = z.object(cardFields).partial()
export const cardOptionsSchema = z.object({
  imageRatio: cardFields.imageRatio.default('template'),
  imageFit: cardFields.imageFit.default('template'),
  showCategory: cardFields.showCategory.default(true),
  showBrand: cardFields.showBrand.default(false),
  showOptions: cardFields.showOptions.default(true),
  showBadge: cardFields.showBadge.default(true),
  quickAdd: cardFields.quickAdd.default(true),
})
export const presentationSchema = z
  .object({
    header: z
      .object({
        template: z.string().min(1).optional(),
        sticky: z.boolean().default(false),
        density: z.enum(['comfortable', 'compact']).default('comfortable'),
        showAnnouncement: z.boolean().default(true),
        showSearch: z.boolean().default(true),
        showTagline: z.boolean().default(true),
        searchLabel: z.string().default('Find your next upgrade'),
      })
      .prefault({}),
    footer: z
      .object({
        template: z.string().min(1).optional(),
        showCategories: z.boolean().default(true),
        showDescription: z.boolean().default(true),
        showWordmark: z.boolean().default(true),
        showLocale: z.boolean().default(true),
      })
      .prefault({}),
    catalog: z
      .object({
        layout: z.enum(['template', 'sidebar', 'toolbar']).default('template'),
        columns: z.number().int().min(1).max(4).optional(),
        mobileColumns: z.union([z.literal(1), z.literal(2)]).default(2),
        defaultSort: sortSchema.default('featured'),
        showCategoryTabs: z.boolean().default(true),
        filters: z
          .object({
            search: z.boolean().default(true),
            brand: z.boolean().default(true),
            price: z.boolean().default(true),
            availability: z.boolean().default(true),
          })
          .prefault({}),
        eyebrow: z.string().default('THE COLLECTION'),
        title: z.string().default('Find your everyday.'),
        description: z.string().default('A considered selection. A better kind of everyday.'),
      })
      .prefault({}),
    productCard: cardOptionsSchema.prefault({}),
    benefitsPosition: z.enum(['start', 'end', 'hidden']).default('end'),
  })
  .prefault({})
export const sectionBase = {
  id: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][\w-]*$/, 'Use a letter followed by letters, numbers, hyphens or underscores'),
  enabled: z.boolean().default(true),
  template: z.string().min(1).optional(),
  style: z
    .object({
      tone: z.enum(['template', 'surface', 'contrast', 'accent']).default('template'),
      spacing: z.enum(['template', 'none', 'compact', 'comfortable', 'airy']).default('template'),
      width: z.enum(['template', 'contained', 'full']).default('template'),
    })
    .prefault({}),
}
export const mediaOptions = {
  imageFit: z.enum(['template', 'contain', 'cover']).default('template'),
  imagePosition: z
    .object({
      x: z.number().min(0).max(100).default(50),
      y: z.number().min(0).max(100).default(50),
    })
    .optional(),
  imageSide: z.enum(['left', 'right']).default('right'),
}
