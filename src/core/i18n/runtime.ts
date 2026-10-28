import { IntlMessageFormat } from 'intl-messageformat'
import { ar } from './ar'
import { installTranslationRuntime } from './translate'
const english: Record<string, string> = {
  'matching.count': '{count, plural, one {# matching product} other {# matching products}}',
  'products.count': '{count, plural, one {# product} other {# products}}',
  'options.count': '{count, plural, one {# option} other {# options}}',
  'cart.added': '{name} added to your bag',
  'cart.stock': 'You already have all available stock in your bag.',
  'stock.count': '{count, plural, one {# available} other {# available}}',
}
const cache = new Map<string, IntlMessageFormat>()
function formatMessage(
  locale: string,
  key: string,
  values: Record<string, string | number> = {},
  overrides: Record<string, string> = {},
) {
  const message =
    overrides[key] ?? (locale.startsWith('ar') ? ar[key] : undefined) ?? english[key] ?? key
  const cacheKey = locale + '|' + message
  let formatter = cache.get(cacheKey)
  try {
    if (!formatter) {
      formatter = new IntlMessageFormat(message, locale)
      if (cache.size > 500) cache.delete(cache.keys().next().value!)
      cache.set(cacheKey, formatter)
    }
    return String(formatter.format(values))
  } catch {
    return message
  }
}

installTranslationRuntime(formatMessage)
