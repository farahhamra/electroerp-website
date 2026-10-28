import { safeUrl } from './contracts'
import type { Diagnostic, EngineConfig, EngineSection } from './contracts'
import { diagnostic, zodDiagnostics } from './diagnostics'
import type { StorefrontEngine } from '../../engine/registry'
import { safeHref } from '../routing/links'
export function unknownFields(
  raw: unknown,
  parsed: unknown,
  path: (string | number)[] = [],
  severity: Diagnostic['severity'] = 'error',
): Diagnostic[] {
  if (Array.isArray(raw) && Array.isArray(parsed))
    return raw.flatMap((v, i) => unknownFields(v, parsed[i], [...path, i], severity))
  if (
    !raw ||
    !parsed ||
    typeof raw !== 'object' ||
    typeof parsed !== 'object' ||
    Array.isArray(raw) ||
    Array.isArray(parsed)
  )
    return []
  return Object.entries(raw).flatMap(([k, v]) =>
    !Object.hasOwn(parsed, k) && v !== undefined
      ? [diagnostic('config.unknown_field', [...path, k], 'Unknown configuration field', severity)]
      : unknownFields(v, (parsed as Record<string, unknown>)[k], [...path, k], severity),
  )
}
function walk(
  value: unknown,
  fn: (value: Record<string, unknown>, path: (string | number)[]) => void,
  path: (string | number)[] = [],
) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, fn, [...path, i]))
    return
  }
  if (value && typeof value === 'object') {
    fn(value as Record<string, unknown>, path)
    for (const [k, v] of Object.entries(value)) walk(v, fn, [...path, k])
  }
}
function luminance(hex: string) {
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}
export function semanticDiagnostics(
  engine: EngineConfig,
  registry: StorefrontEngine,
): Diagnostic[] {
  const out: Diagnostic[] = []
  const anchorIds = new Map<string, Set<string>>()
  for (const page of engine.pages) {
    const set = new Set<string>()
    function collect(sections: EngineSection[]) {
      for (const section of sections)
        if (section.enabled) {
          set.add(section.id)
          if (section.type === 'columns')
            for (const cell of section.cells as { sections: EngineSection[] }[])
              collect(cell.sections)
        }
    }
    collect(page.sections)
    anchorIds.set(page.id, set)
  }
  walk({ ...engine, source: undefined, diagnostics: undefined }, (value, path) => {
    for (const field of ['image', 'logo', 'src', 'poster', 'avatar']) {
      if (
        typeof value[field] === 'string' &&
        value[field] &&
        !safeUrl.safeParse(value[field]).success
      )
        out.push(diagnostic('media.unsafe', [...path, field], 'Use a local asset or HTTPS URL'))
    }
    if (typeof value.font === 'string' && !registry.font(value.font))
      out.push(
        diagnostic(
          'font.unregistered',
          [...path, 'font'],
          'Register this font at the engine composition root before using it',
        ),
      )
    if (
      value.kind === 'section' &&
      (!engine.pages.some((p) => p.enabled && p.id === value.pageId) ||
        !anchorIds.get(String(value.pageId))?.has(String(value.sectionId)))
    )
      out.push(
        diagnostic(
          'link.anchor_missing',
          path,
          'Section destination must reference an enabled page and section',
        ),
      )
    if (typeof value.href === 'string' && value.href && !safeHref(value.href))
      out.push(diagnostic('link.unsafe', [...path, 'href'], 'Unsafe link destination'))
    if (
      typeof value.contactId === 'string' &&
      !engine.business.contacts.some((c) => c.id === value.contactId)
    )
      out.push(
        diagnostic('business.contact_missing', [...path, 'contactId'], 'Unknown business contact'),
      )
    if (
      typeof value.locationId === 'string' &&
      !engine.business.locations.some((location) => location.id === value.locationId)
    )
      out.push(diagnostic('business.reference', [...path, 'locationId'], 'Unknown location'))
    if (Array.isArray(value.contactIds))
      for (const [i, id] of value.contactIds.entries())
        if (!engine.business.contacts.some((c) => c.id === id))
          out.push(
            diagnostic(
              'business.contact_missing',
              [...path, 'contactIds', i],
              'Unknown business contact',
            ),
          )
    if (value.type === 'promotional-collections')
      for (const [i, item] of (value.items as { collectionId: string }[]).entries())
        if (!engine.collections[item.collectionId])
          out.push(
            diagnostic(
              'collection.reference',
              [...path, 'items', i, 'collectionId'],
              'Unknown collection',
            ),
          )
    if (
      value.type === 'video' &&
      !(value.transcript || (Array.isArray(value.tracks) && value.tracks.length))
    )
      out.push(
        diagnostic(
          'accessibility.video_text',
          path,
          'Provide captions or a transcript for this video',
          'warning',
        ),
      )
    if (value.src && value.alt === '')
      out.push(
        diagnostic(
          'content.image_alt',
          [...path, 'alt'],
          'Provide a description for informative images',
          'warning',
        ),
      )
    if (value.type === 'map' && value.embed) {
      const location = engine.business.locations.find((l) => l.id === value.locationId)
      if (location && (location.latitude === undefined || location.longitude === undefined))
        out.push(
          diagnostic(
            'map.coordinates',
            path,
            'Interactive maps require latitude and longitude',
            'warning',
          ),
        )
    }
    if (value.background && typeof value.background === 'object' && 'image' in value.background)
      out.push(
        diagnostic(
          'contrast.indeterminate',
          [...path, 'background'],
          'Text contrast over an image requires visual review',
          'info',
        ),
      )
  })
  const palette = { ...engine.theme, ...engine.theme.tokens?.palette }
  for (const [foreground, background] of [
    ['foreground', 'background'],
    ['accentText', 'accent'],
  ] as const) {
    const a = luminance(palette[foreground]),
      b = luminance(palette[background])
    if ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) < 4.5)
      out.push(
        diagnostic(
          'contrast.low',
          ['theme', foreground],
          `${foreground}/${background} contrast is below 4.5:1`,
          'warning',
        ),
      )
  }
  const parseCommerce = (
    raw: Record<string, unknown>[],
    prefix: (string | number)[],
    seen: Set<string>,
    depth = 0,
  ): EngineSection[] => {
    if (depth > 3) {
      out.push(diagnostic('section.depth', prefix, 'Maximum column nesting is three levels'))
      return []
    }
    return raw.flatMap((node, i) => {
      const path = [...prefix, i],
        definition = registry.section(String(node.type))
      if (!definition) {
        out.push(diagnostic('section.unknown', [...path, 'type'], 'Unregistered section'))
        return []
      }
      const parsed = definition.schema.safeParse(node)
      if (!parsed.success) {
        out.push(...zodDiagnostics(parsed.error, path))
        return []
      }
      const section = parsed.data as EngineSection
      if (seen.has(section.id))
        out.push(diagnostic('section.duplicate', [...path, 'id'], 'Duplicate section ID'))
      seen.add(section.id)
      if (section.type === 'hero')
        out.push(
          diagnostic(
            'page.heading',
            path,
            'Category pages already provide a primary heading; use a banner instead',
          ),
        )
      if (section.type === 'columns')
        section.cells = (section.cells as { sections: Record<string, unknown>[] }[]).map(
          (cell, n) => ({
            sections: parseCommerce(
              cell.sections,
              [...path, 'cells', n, 'sections'],
              seen,
              depth + 1,
            ),
          }),
        )
      return [section]
    })
  }
  const categories = [
    { path: ['commerce', 'category'], layout: engine.commerce.category },
    ...Object.entries(engine.commerce.categories).map(([id, layout]) => ({
      path: ['commerce', 'categories', id],
      layout,
    })),
  ]
  for (const { path, layout } of categories) {
    const seen = new Set<string>()
    layout.before = parseCommerce(layout.before, [...path, 'before'], seen)
    layout.after = parseCommerce(layout.after, [...path, 'after'], seen)
    if (seen.size > 100)
      out.push(
        diagnostic(
          'section.count',
          path,
          'At most 100 section nodes are supported per category layout',
        ),
      )
  }
  const products = [
    { path: ['commerce', 'product'], layout: engine.commerce.product },
    ...Object.entries(engine.commerce.products).map(([id, layout]) => ({
      path: ['commerce', 'products', id],
      layout,
    })),
  ]
  for (const { path, layout } of products) {
    const blocks = Object.values(layout.regions).flat()
    if (new Set(blocks).size !== blocks.length)
      out.push(
        diagnostic(
          'commerce.duplicate_block',
          [...path, 'regions'],
          'Product blocks must be unique',
        ),
      )
    if (Object.values(layout.design?.layout ?? {}).some((value) => value?.visible === false))
      out.push(
        diagnostic(
          'commerce.visibility',
          [...path, 'design'],
          'A product layout cannot hide its purchase controls',
        ),
      )
  }
  return out
}
