const english: Record<string, string> = {
  'matching.count': '{count, plural, one {# matching product} other {# matching products}}',
  'products.count': '{count, plural, one {# product} other {# products}}',
  'options.count': '{count, plural, one {# option} other {# options}}',
  'cart.added': '{name} added to your bag',
  'cart.stock': 'You already have all available stock in your bag.',
  'stock.count': '{count, plural, one {# available} other {# available}}',
}
type Formatter = (
  locale: string,
  key: string,
  values: Record<string, string | number>,
  overrides: Record<string, string>,
) => string
let formatter: Formatter | undefined
export function installTranslationRuntime(value: Formatter) {
  formatter = value
}
export function translate(
  locale: string,
  key: string,
  values: Record<string, string | number> = {},
  overrides: Record<string, string> = {},
) {
  if (formatter) return formatter(locale, key, values, overrides)
  if (key === 'matching.count')
    return `${values.count} matching ${values.count === 1 ? 'product' : 'products'}`
  if (key === 'products.count')
    return `${values.count} ${values.count === 1 ? 'product' : 'products'}`
  if (key === 'options.count') return `${values.count} ${values.count === 1 ? 'option' : 'options'}`
  if (key === 'stock.count') return `${values.count} available`
  const message = overrides[key] ?? english[key] ?? key
  return message.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`))
}
