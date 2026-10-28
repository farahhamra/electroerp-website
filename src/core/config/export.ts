import { z } from 'zod'
import { v2Schema } from './contracts'
import { localizedJsonSchema } from '../i18n/content'
import { defaultEngine, type StorefrontEngine } from '../../engine/registry'
export function exportV2Schema(engine: StorefrontEngine = defaultEngine) {
  const schema = z.toJSONSchema(v2Schema, { io: 'input' }) as Record<string, any>
  const sections = {
    oneOf: engine.sections().map((d) => z.toJSONSchema(d.schema, { io: 'input' })),
  }
  schema.properties.pages.items.properties.sections.items = { $ref: '#/$defs/section' }
  const allLayouts = [
    schema.properties.commerce.properties.category,
    schema.properties.commerce.properties.categories.additionalProperties,
  ]
  for (const layout of allLayouts)
    for (const key of ['before', 'after'])
      layout.properties[key].items = { $ref: '#/$defs/section' }
  for (const def of sections.oneOf as Record<string, any>[])
    if (def.properties?.type?.const === 'columns')
      def.properties.cells.items.properties.sections.items = { $ref: '#/$defs/section' }
  schema.$defs = { section: sections }
  schema.title = 'ElectroERP storefront configuration v2'
  schema.description =
    'Localized JSON configuration. Use validateStoreConfig for reference, capability and content diagnostics.'
  return localizedJsonSchema(
    schema,
    engine.sections().flatMap((s) => s.localizable ?? []),
  )
}
