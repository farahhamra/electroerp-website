import { z } from 'zod'
import type { ComponentType } from 'react'
import {
  extraSectionSchemas,
  nativeSectionSchemas,
  type EngineSection,
} from '../core/config/contracts'
export interface SectionDefinition {
  type: string
  version: number
  schema: z.ZodType
  description: string
  localizable?: readonly string[]
  load?: () => Promise<{ default: ComponentType<{ section: EngineSection }> }>
}
export interface ProviderDefinition {
  id: string
  version: number
  schema: z.ZodType
  create: (input: unknown) => Promise<import('../core/schema').DataProvider>
}
export function createStorefrontEngine(
  options: {
    sections?: SectionDefinition[]
    providers?: ProviderDefinition[]
    templates?: string[]
    fonts?: { id: string; family: string; fallback: 'serif' | 'sans-serif' | 'monospace' }[]
  } = {},
) {
  const definitions = new Map<string, SectionDefinition>()
  for (const [type, schema] of Object.entries({ ...nativeSectionSchemas, ...extraSectionSchemas }))
    definitions.set(type, Object.freeze({ type, version: 1, schema, description: type }))
  for (const def of options.sections ?? []) {
    if (definitions.has(def.type) || !/^\w[\w-]*:[\w-]+$/.test(def.type) || def.version < 1)
      throw new Error(`Invalid or duplicate section registration: ${def.type}`)
    definitions.set(
      def.type,
      Object.freeze({
        ...def,
        localizable: def.localizable ? Object.freeze([...def.localizable]) : undefined,
      }),
    )
  }
  const providers = new Map<string, ProviderDefinition>()
  for (const def of options.providers ?? []) {
    if (
      providers.has(def.id) ||
      !/^\w[\w-]*:[\w-]+$/.test(def.id) ||
      !Number.isInteger(def.version) ||
      def.version < 1
    )
      throw new Error(`Invalid or duplicate provider: ${def.id}`)
    providers.set(def.id, Object.freeze({ ...def }))
  }
  const fonts = new Map([
    ['body', { id: 'body', family: 'DM Sans', fallback: 'sans-serif' }],
    ['heading', { id: 'heading', family: 'Cormorant Garamond', fallback: 'serif' }],
    ['arabic', { id: 'arabic', family: 'Noto Sans Arabic Variable', fallback: 'sans-serif' }],
  ])
  for (const font of options.fonts ?? []) {
    if (fonts.has(font.id) || !/^[-a-z0-9]+$/.test(font.id))
      throw new Error('Invalid font registration')
    fonts.set(font.id, Object.freeze({ ...font }))
  }
  const templates = Object.freeze([
    ...(options.templates ?? ['electronics', 'fashion', 'home', 'beauty', 'outdoor']),
  ])
  return Object.freeze({
    templates,
    fonts: () => [...fonts.values()].map((font) => ({ ...font })),
    font: (id: string) => (fonts.has(id) ? { ...fonts.get(id)! } : undefined),
    section: (type: string) => definitions.get(type),
    provider: (id: string) => providers.get(id),
    sections: () => [...definitions.values()],
    capabilities: () => ({
      version: 2,
      configVersions: [1, 2],
      templates,
      fonts: [...fonts.values()],
      breakpoints: { tablet: 768, desktop: 1024 },
      sections: [...definitions.values()].map((d) => ({
        type: d.type,
        version: d.version,
        description: d.description,
        localizable: d.localizable ?? [],
        schema: z.toJSONSchema(d.schema, { io: 'input' }),
      })),
      providers: [...providers.values()].map((d) => ({ id: d.id, version: d.version })),
    }),
  })
}
export type StorefrontEngine = ReturnType<typeof createStorefrontEngine>
export const defaultEngine = createStorefrontEngine()
