/** Framework-independent contract entry point. No renderer or browser globals. */
export { validateStoreConfig, normalizeStoreConfig, migrateV1 } from './config/normalize'
export { ConfigurationError, diagnostic } from './config/diagnostics'
export { exportV2Schema } from './config/export'
export { v2Schema, querySchema, destinationSchema } from './config/contracts'
export type {
  Diagnostic,
  EngineConfig,
  EnginePage,
  EngineSection,
  CollectionQuery,
  ValidationResult,
} from './config/contracts'
export { createStorefrontEngine } from '../engine/registry'
export type { SectionDefinition, ProviderDefinition, StorefrontEngine } from '../engine/registry'
export { evaluateCollection, queryKey } from './collections/query'
export { resolveDestination, pagePath, localePath } from './routing/links'
export { configSchema, productSchema, categorySchema } from './schema'
