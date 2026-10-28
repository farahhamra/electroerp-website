const fields = new Set(['image', 'logo', 'src', 'poster', 'imageUrl'])
export function resolveMedia(
  input: unknown,
  baseUrl: string,
  pathOnly = false,
  parent = '',
): unknown {
  if (Array.isArray(input))
    return input.map((value) =>
      typeof value === 'string' && parent === 'images'
        ? resolve(value)
        : resolveMedia(value, baseUrl, pathOnly, parent),
    )
  if (!input || typeof input !== 'object') return input
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' &&
      (fields.has(key) || (key === 'url' && (input as { provider?: string }).provider === 'file'))
        ? resolve(value)
        : resolveMedia(value, baseUrl, pathOnly, key),
    ]),
  )
  function resolve(value: string) {
    if (!value) return value
    const url = new URL(value, baseUrl)
    return pathOnly && url.origin === new URL(baseUrl).origin ? url.pathname + url.search : url.href
  }
}
