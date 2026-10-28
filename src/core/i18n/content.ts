import type { Diagnostic } from '../config/contracts'
import { diagnostic } from '../config/diagnostics'
const allowed = new Set([
  'title',
  'announcement',
  'name',
  'tagline',
  'description',
  'label',
  'eyebrow',
  'text',
  'copyright',
  'categoriesTitle',
  'linksTitle',
  'searchLabel',
  'notice',
  'footnote',
  'imageAlt',
  'imageLabel',
  'edition',
  'caption',
  'paragraphs',
  'question',
  'answer',
  'quote',
  'role',
  'alt',
  'transcript',
  'columns',
  'values',
  'street',
  'city',
  'region',
  'country',
  'unit',
  'value',
  'details',
  'categoryName',
])
export function resolveContent(
  input: unknown,
  locale: string,
  fallback: string,
  defaultLocale: string,
  diagnostics: Diagnostic[] = [],
  path: (string | number)[] = [],
  extraFields: string[] = [],
): unknown {
  if (Array.isArray(input))
    return input.map((v, i) =>
      resolveContent(v, locale, fallback, defaultLocale, diagnostics, [...path, i], extraFields),
    )
  if (!input || typeof input !== 'object') return input
  const obj = input as Record<string, unknown>
  if (
    Object.keys(obj).length === 1 &&
    obj.values &&
    typeof obj.values === 'object' &&
    !Array.isArray(obj.values)
  ) {
    const field = [...path].reverse().find((p) => typeof p === 'string') as string
    if (!allowed.has(field) && !extraFields.includes(field)) {
      diagnostics.push(diagnostic('i18n.invalid_field', path, 'This field cannot be localized'))
      return ''
    }
    const values = obj.values as Record<string, unknown>
    if (typeof values[defaultLocale] !== 'string')
      diagnostics.push(
        diagnostic(
          'i18n.default_missing',
          [...path, 'values', defaultLocale],
          'Default-locale content is required',
        ),
      )
    if (typeof values[locale] !== 'string')
      diagnostics.push(
        diagnostic(
          'i18n.translation_missing',
          [...path, 'values', locale],
          `Using fallback content for ${locale}`,
          'warning',
        ),
      )
    return values[locale] ?? values[fallback] ?? values[defaultLocale] ?? ''
  }
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      resolveContent(v, locale, fallback, defaultLocale, diagnostics, [...path, k], extraFields),
    ]),
  )
}
export function localizedJsonSchema(schema: unknown, extraFields: string[] = []): unknown {
  if (!schema || typeof schema !== 'object') return schema
  if (Array.isArray(schema)) return schema.map((value) => localizedJsonSchema(value, extraFields))
  const obj = schema as Record<string, any>
  const result: Record<string, any> = Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, localizedJsonSchema(value, extraFields)]),
  )
  const localize = (child: Record<string, any>): Record<string, any> => {
    if (Array.isArray(child.anyOf)) return { ...child, anyOf: child.anyOf.map(localize) }
    if (child.type === 'array' && child.items) return { ...child, items: localize(child.items) }
    if (child.type !== 'string') return child
    return {
      anyOf: [
        child,
        {
          type: 'object',
          properties: { values: { type: 'object', additionalProperties: child, minProperties: 1 } },
          required: ['values'],
          additionalProperties: false,
        },
      ],
    }
  }
  if (obj.properties)
    result.properties = Object.fromEntries(
      Object.entries(obj.properties).map(([key, value]) => {
        const child = localizedJsonSchema(value, extraFields) as Record<string, any>
        return [key, allowed.has(key) || extraFields.includes(key) ? localize(child) : child]
      }),
    )
  return result
}

export function variantLabel(variant: import('../schema').Variant, locale: string) {
  return (
    variant.translations?.[locale]?.label ??
    Object.values(variant.translations?.[locale]?.options ?? variant.options).join(' / ')
  )
}
