import { commerceDefaults } from './commerce-defaults'
import { semanticDiagnostics, unknownFields } from './semantic'
import { resolveMedia } from './media'
import { configSchema, type StoreConfig, type Product, type Category } from '../schema'
import {
  v2Schema,
  type Diagnostic,
  type EngineConfig,
  type EnginePage,
  type EngineSection,
  type ValidationResult,
  destinationSchema,
} from './contracts'
import { diagnostic, zodDiagnostics, ConfigurationError, stableDiagnostics } from './diagnostics'
import { defaultEngine, type StorefrontEngine } from '../../engine/registry'
import { resolveContent } from '../i18n/content'
import { normalizePath, pagePath, resolveDestination } from '../routing/links'
import { validateBusiness } from '../business/validate'
export interface NormalizeOptions {
  locale?: string
  registry?: StorefrontEngine
  products?: Product[]
  categories?: Category[]
  configUrl?: string
  mode?: 'mock' | 'api'
  catalogCoverage?: 'complete' | 'partial'
}
function linksToLegacy(
  input: unknown,
  engine: EngineConfig,
  locale: string,
  options: NormalizeOptions,
  diagnostics: Diagnostic[],
  path: (string | number)[] = [],
): unknown {
  if (Array.isArray(input))
    return input.map((v, i) => linksToLegacy(v, engine, locale, options, diagnostics, [...path, i]))
  if (!input || typeof input !== 'object') return input
  const obj = input as Record<string, unknown>
  if ('destination' in obj) {
    const parsed = destinationSchema.safeParse(obj.destination)
    if (!parsed.success) {
      diagnostics.push(...zodDiagnostics(parsed.error, [...path, 'destination']))
      return obj
    }
    let href: string | undefined
    try {
      href = resolveDestination(parsed.data, {
        engine,
        locale,
        products: options.products,
        categories: options.categories,
      })
    } catch {
      /* handled below */
    }
    if (!href) {
      const remote = parsed.data.kind === 'product' || parsed.data.kind === 'category'
      diagnostics.push(
        diagnostic(
          remote ? 'link.unresolved' : 'link.invalid',
          path,
          'Destination could not be resolved',
          remote && options.mode !== 'mock' && options.catalogCoverage !== 'complete'
            ? 'warning'
            : 'error',
        ),
      )
    }
    return {
      ...Object.fromEntries(
        Object.entries(obj)
          .filter(([k]) => k !== 'destination')
          .map(([k, v]) => [
            k,
            linksToLegacy(v, engine, locale, options, diagnostics, [...path, k]),
          ]),
      ),
      href: href ?? '',
    }
  }
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      linksToLegacy(v, engine, locale, options, diagnostics, [...path, k]),
    ]),
  )
}
function validateConfig(
  input: unknown,
  options: NormalizeOptions = {},
): ValidationResult<StoreConfig> {
  const diagnostics: Diagnostic[] = []
  if (!input || typeof input !== 'object')
    return {
      ok: false,
      diagnostics: [diagnostic('config.object', [], 'Expected a configuration object')],
    }
  const raw = (
    (input as { version?: number }).version === 2 && options.configUrl
      ? resolveMedia(input, options.configUrl)
      : input
  ) as Record<string, unknown>
  if (raw.version === 1) {
    const result = configSchema.safeParse(raw)
    if (!result.success) return { ok: false, diagnostics: zodDiagnostics(result.error) }
    return {
      ok: true,
      value: result.data,
      diagnostics: unknownFields(raw, result.data, [], 'warning'),
    }
  }
  if (raw.version !== 2)
    return {
      ok: false,
      diagnostics: [
        diagnostic('config.version', ['version'], 'Supported configuration versions are 1 and 2'),
      ],
    }
  const registry = options.registry ?? defaultEngine
  const i18n = raw.i18n as Record<string, unknown> | undefined
  const defaultLocale = typeof i18n?.defaultLocale === 'string' ? i18n.defaultLocale : 'en-US'
  const locale = options.locale ?? defaultLocale
  const resolved = commerceDefaults(
    resolveContent(
      raw,
      locale,
      typeof i18n?.fallbackLocale === 'string' ? i18n.fallbackLocale : defaultLocale,
      defaultLocale,
      diagnostics,
      [],
      registry.sections().flatMap((s) => s.localizable ?? []),
    ),
  )
  const parsed = v2Schema.safeParse(resolved)
  if (!parsed.success)
    return { ok: false, diagnostics: [...diagnostics, ...zodDiagnostics(parsed.error)] }
  diagnostics.push(...unknownFields(resolved, parsed.data))
  const engine = { ...parsed.data, source: raw, diagnostics, pages: [] } as EngineConfig
  const locales = engine.i18n.locales.map((l) => l.code)
  if (
    new Set(locales).size !== locales.length ||
    !locales.includes(defaultLocale) ||
    !locales.includes(locale) ||
    (engine.i18n.fallbackLocale && !locales.includes(engine.i18n.fallbackLocale))
  )
    diagnostics.push(
      diagnostic(
        'i18n.locales',
        ['i18n'],
        'Locales must be unique and include the default, active, and fallback locales',
      ),
    )
  const templateIds = [
    engine.template,
    engine.presentation.header.template,
    engine.presentation.footer.template,
  ].filter(Boolean)
  for (const id of templateIds)
    if (!registry.templates.includes(id!))
      diagnostics.push(diagnostic('template.unknown', ['template'], `Unregistered template: ${id}`))
  for (const [type, version] of Object.entries(engine.extensions))
    if ((registry.section(type)?.version ?? registry.provider(type)?.version) !== version)
      diagnostics.push(
        diagnostic(
          'extension.version',
          ['extensions', type],
          'Required extension is missing or incompatible',
        ),
      )
  // Establish all page identities before resolving links between pages.
  engine.pages = parsed.data.pages as EnginePage[]
  const pageIds = new Set<string>(),
    routes = new Map<string, (string | number)[]>()
  for (const [index, page] of engine.pages.entries()) {
    const path = ['pages', index]
    if (pageIds.has(page.id))
      diagnostics.push(diagnostic('page.duplicate', [...path, 'id'], 'Page IDs must be unique'))
    pageIds.add(page.id)
    if (!page.paths[defaultLocale])
      diagnostics.push(
        diagnostic(
          'page.default_path',
          [...path, 'paths', defaultLocale],
          'Default-locale path is required',
        ),
      )
    for (const [code, value] of Object.entries(page.paths)) {
      if (!locales.includes(code))
        diagnostics.push(
          diagnostic('page.locale', [...path, 'paths', code], 'Path locale is not supported'),
        )
      try {
        const normalized = normalizePath(value)
        if (
          /^\/(catalog|categories|products|cart|checkout)(\/|$)/.test(normalized) ||
          locales.some((l) => normalized === `/${l}` || normalized.startsWith(`/${l}/`))
        )
          throw new Error('Path collides with a system or locale prefix')
      } catch (error) {
        diagnostics.push(
          diagnostic('page.path', [...path, 'paths', code], (error as Error).message),
        )
      }
    }
    if (page.enabled)
      for (const code of locales)
        try {
          const route = pagePath(page, engine, code).toLowerCase()
          const previous = routes.get(route)
          if (previous) {
            const d = diagnostic(
              'page.route_collision',
              [...path, 'paths', code],
              `Duplicate route: ${route}`,
            )
            d.relatedPaths = [previous]
            diagnostics.push(d)
          } else routes.set(route, [...path, 'paths', code])
        } catch {
          /* path validation above */
        }
    const seen = new Set<string>()
    let count = 0,
      heroes = 0
    function parseNodes(
      nodes: Record<string, unknown>[],
      prefix: (string | number)[],
      depth = 0,
      ancestorEnabled = true,
    ): EngineSection[] {
      if (depth > 3) {
        diagnostics.push(
          diagnostic('section.depth', prefix, 'Maximum column nesting is three levels'),
        )
        return []
      }
      return nodes.flatMap((node, n) => {
        count++
        const at = [...prefix, n],
          type = String(node.type ?? ''),
          def = registry.section(type)
        if (!def) {
          diagnostics.push(
            diagnostic('section.unknown', [...at, 'type'], `Unregistered section: ${type}`),
          )
          return []
        }
        const resolvedNode = linksToLegacy(node, engine, locale, options, diagnostics, at)
        // Native sections consume legacy links; new section definitions keep typed links.
        const native = [
          'hero',
          'products',
          'categories',
          'banner',
          'text',
          'faq',
          'benefits',
        ].includes(type)
        const result = def.schema.safeParse(native ? resolvedNode : node)
        if (!result.success) {
          diagnostics.push(...zodDiagnostics(result.error, at))
          return []
        }
        const section = result.data as EngineSection
        if (seen.has(section.id))
          diagnostics.push(
            diagnostic(
              'section.duplicate',
              [...at, 'id'],
              'Section IDs must be unique within a page',
            ),
          )
        seen.add(section.id)
        if (section.template && !registry.templates.includes(section.template))
          diagnostics.push(
            diagnostic('template.unknown', [...at, 'template'], 'Unregistered template'),
          )
        if (type === 'hero' && section.enabled && ancestorEnabled) heroes++
        if (type === 'columns')
          section.cells = (section.cells as { sections: Record<string, unknown>[] }[]).map(
            (cell, i) => ({
              sections: parseNodes(
                cell.sections,
                [...at, 'cells', i, 'sections'],
                depth + 1,
                ancestorEnabled && section.enabled,
              ),
            }),
          )
        if (
          type === 'comparison-table' &&
          (section.rows as { values: unknown[] }[]).some(
            (r) => r.values.length !== (section.columns as string[]).length,
          )
        )
          diagnostics.push(
            diagnostic(
              'section.table_columns',
              [...at, 'rows'],
              'Each row must match the number of columns',
            ),
          )
        if (
          typeof section.locationId === 'string' &&
          !engine.business.locations.some((l) => l.id === section.locationId)
        )
          diagnostics.push(
            diagnostic('business.reference', [...at, 'locationId'], 'Unknown location'),
          )
        if (
          typeof section.collectionId === 'string' &&
          ['collection'].includes(type) &&
          !engine.collections[section.collectionId]
        )
          diagnostics.push(
            diagnostic('collection.reference', [...at, 'collectionId'], 'Unknown collection'),
          )
        return [section]
      })
    }
    page.sections = parseNodes(parsed.data.pages[index].sections, [...path, 'sections'])
    if (count > 100)
      diagnostics.push(
        diagnostic(
          'section.count',
          [...path, 'sections'],
          'At most 100 total section nodes are supported per page',
        ),
      )
    if ((page.heading === 'hero' && heroes !== 1) || (page.heading === 'title' && heroes > 0))
      diagnostics.push(
        diagnostic(
          'page.heading',
          [...path, 'heading'],
          'Choose exactly one hero heading or a page title without hero sections',
        ),
      )
  }
  if (!engine.pages.some((p) => p.enabled && p.paths[defaultLocale] === '/'))
    diagnostics.push(diagnostic('page.home', ['pages'], 'An enabled homepage at / is required'))
  diagnostics.push(...validateBusiness(engine.business), ...semanticDiagnostics(engine, registry))
  const layouts = [
    ['commerce', 'product', engine.commerce.product],
    ...Object.entries(engine.commerce.products).map(([id, v]) => ['commerce', 'products', id, v]),
  ] as unknown[][]
  for (const entry of layouts) {
    const layout = entry.at(-1) as EngineConfig['commerce']['product']
    const blocks = Object.values(layout.regions).flat()
    for (const required of ['gallery', 'title', 'price', 'variants', 'availability', 'purchase'])
      if (blocks.filter((b) => b === required).length !== 1)
        diagnostics.push(
          diagnostic(
            'commerce.required_block',
            entry.slice(0, -1) as string[],
            `Product layout requires exactly one ${required} block`,
          ),
        )
  }
  const home = engine.pages.find((p) => p.paths[defaultLocale] === '/')
  const legacyInput = linksToLegacy(
    {
      ...parsed.data,
      version: 1,
      locale,
      sections:
        home?.sections.filter((s) =>
          ['hero', 'products', 'categories', 'banner', 'text', 'faq', 'benefits'].includes(s.type),
        ) ?? [],
    },
    engine,
    locale,
    options,
    diagnostics,
  ) as Record<string, unknown>
  // Contact links are safe but intentionally absent from the frozen v1 input schema.
  const navigation = (legacyInput.navigation ?? []) as StoreConfig['navigation']
  legacyInput.navigation = []
  const footer = legacyInput.footer as StoreConfig['footer']
  legacyInput.footer = { ...footer, links: [], socialLinks: [], columns: [], cta: undefined }
  legacyInput.sections = []
  const legacy = configSchema.safeParse(legacyInput)
  if (!legacy.success) diagnostics.push(...zodDiagnostics(legacy.error))
  if (!legacy.success || diagnostics.some((d) => d.severity === 'error'))
    return { ok: false, diagnostics }
  const config: StoreConfig = { ...legacy.data, navigation, footer, engine }
  return { ok: true, value: config, diagnostics }
}
/** Pure validation entry point with deterministic, deduplicated source diagnostics. */
export function validateStoreConfig(
  input: unknown,
  options: NormalizeOptions = {},
): ValidationResult<StoreConfig> {
  const result = validateConfig(input, options)
  result.diagnostics = stableDiagnostics(result.diagnostics)
  if (result.ok && result.value.engine) result.value.engine.diagnostics = result.diagnostics
  return result
}
export function normalizeStoreConfig(input: unknown, options: NormalizeOptions = {}): StoreConfig {
  const result = validateStoreConfig(input, options)
  if (!result.ok) throw new ConfigurationError(result.diagnostics)
  return result.value
}
export function migrateV1(input: unknown) {
  const v1 = configSchema.parse(input)
  const sections = [...v1.sections]
  if (
    v1.benefits.length &&
    !sections.some((s) => s.type === 'benefits') &&
    v1.presentation.benefitsPosition !== 'hidden'
  ) {
    const benefit = {
      id: 'migrated-benefits',
      type: 'benefits',
      enabled: true,
      items: v1.benefits,
      style: { tone: 'template', spacing: 'template', width: 'template' },
    }
    if (v1.presentation.benefitsPosition === 'start')
      sections.unshift(benefit as (typeof sections)[number])
    else sections.push(benefit as (typeof sections)[number])
  }
  const link = (v: { label: string; href: string }) => ({
    label: v.label,
    destination: v.href.startsWith('https://')
      ? { kind: 'external', url: v.href }
      : { kind: 'path', path: v.href },
  })
  const { locale, ...rest } = v1
  return {
    ...rest,
    version: 2,
    sections: undefined,
    i18n: { defaultLocale: locale, locales: [{ code: locale, label: locale, direction: 'ltr' }] },
    navigation: v1.navigation.map((n) => ({
      ...link(n),
      ...(n.children ? { children: n.children.map(link) } : {}),
    })),
    pages: [
      {
        id: 'home',
        title: v1.brand.name,
        paths: { [locale]: '/' },
        heading: sections.some((s) => s.type === 'hero') ? 'hero' : 'title',
        sections,
      },
      ...(['story', 'shipping', 'contact'] as const).map((id) => ({
        id,
        title:
          id === 'story'
            ? v1.brand.tagline
            : id === 'shipping'
              ? 'Good things, on their way.'
              : 'Always room for a conversation.',
        paths: { [locale]: `/${id}` },
        sections: [
          {
            id: `${id}-copy`,
            type: 'text',
            title:
              id === 'story'
                ? v1.brand.tagline
                : id === 'shipping'
                  ? 'Delivery information'
                  : 'Contact',
            paragraphs: [
              id === 'story'
                ? v1.brand.description
                : id === 'shipping'
                  ? v1.checkout.notice
                  : 'Use the contact links below to get in touch.',
            ],
          },
        ],
      })),
    ],
  }
}
