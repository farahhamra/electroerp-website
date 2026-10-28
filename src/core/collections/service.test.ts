import { describe, it, expect, vi } from 'vitest'
import { requestCollection } from './service'
import { querySchema } from '../config/contracts'
import type { DataProvider } from '../schema'
const context = { storeId: 'test', locale: 'en-US', currency: 'USD' }
const result = { items: [], variants: {}, total: 0 }
function provider(queryProducts?: DataProvider['queryProducts']): DataProvider {
  return {
    mode: 'api',
    capabilities: { catalog: 'partial' },
    loadStore: vi.fn(),
    placeOrder: vi.fn(),
    queryProducts,
  }
}
describe('collection request lifecycle', () => {
  it('refuses to treat a partial initial catalog as a complete query source', async () => {
    await expect(requestCollection(provider(), [], querySchema.parse({}), context)).rejects.toThrow(
      'partial selection',
    )
  })
  it('deduplicates concurrent requests and caches completed reads by locale', async () => {
    const query = vi.fn(async () => result),
      adapter = provider(query)
    const [a, b] = await Promise.all([
      requestCollection(adapter, [], querySchema.parse({}), context),
      requestCollection(adapter, [], querySchema.parse({}), context),
    ])
    expect(a).toEqual(b)
    expect(query).toHaveBeenCalledTimes(1)
    await requestCollection(adapter, [], querySchema.parse({}), context)
    expect(query).toHaveBeenCalledTimes(1)
    await requestCollection(adapter, [], querySchema.parse({}), { ...context, locale: 'ar' })
    expect(query).toHaveBeenCalledTimes(2)
  })
  it('only aborts a shared request when all subscribers leave', async () => {
    let finish!: () => void, signal: AbortSignal | undefined
    const query = vi.fn((_query, _context, supplied) => {
      signal = supplied
      return new Promise<typeof result>((resolve) => {
        finish = () => resolve(result)
      })
    })
    const adapter = provider(query),
      first = new AbortController(),
      second = new AbortController()
    const a = requestCollection(adapter, [], querySchema.parse({}), context, first.signal)
    const b = requestCollection(adapter, [], querySchema.parse({}), context, second.signal)
    const rejected = expect(a).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    first.abort()
    await rejected
    expect(signal?.aborted).toBe(false)
    finish()
    expect(await b).toEqual(result)
  })
  it('cancels abandoned work and does not cache failed requests', async () => {
    let signal: AbortSignal | undefined
    const adapter = provider(async (_query, _context, supplied) => {
      signal = supplied
      await new Promise((_, reject) =>
        supplied?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        ),
      )
      return result
    })
    const controller = new AbortController(),
      request = requestCollection(adapter, [], querySchema.parse({}), context, controller.signal)
    const rejected = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await Promise.resolve()
    controller.abort()
    await rejected
    expect(signal?.aborted).toBe(true)
  })
})

it('limits remote fan-out to four calls and skips abandoned queued requests', async () => {
  const finish: (() => void)[] = []
  const query = vi.fn(
    () => new Promise<typeof result>((resolve) => finish.push(() => resolve(result))),
  )
  const adapter = provider(query)
  const controllers = Array.from({ length: 8 }, () => new AbortController())
  const requests = controllers.map((controller, index) =>
    requestCollection(
      adapter,
      [],
      querySchema.parse({ brands: [String(index)] }),
      context,
      controller.signal,
    ),
  )
  await Promise.resolve()
  expect(query).toHaveBeenCalledTimes(4)
  const rejected = expect(requests[7]).rejects.toMatchObject({ name: 'AbortError' })
  controllers[7].abort()
  await rejected
  for (let index = 0; index < 7; index++) {
    finish[index]()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  await Promise.all(requests.slice(0, 7))
  expect(query).toHaveBeenCalledTimes(7)
})

it('keeps a slow shared request deduplicated beyond the cache TTL', async () => {
  vi.useFakeTimers()
  try {
    let finish!: () => void
    const query = vi.fn(
      () =>
        new Promise<typeof result>((resolve) => {
          finish = () => resolve(result)
        }),
    )
    const adapter = provider(query),
      selection = querySchema.parse({})
    const first = requestCollection(adapter, [], selection, context)
    await Promise.resolve()
    vi.setSystemTime(Date.now() + 60000)
    const second = requestCollection(adapter, [], selection, context)
    await Promise.resolve()
    expect(query).toHaveBeenCalledTimes(1)
    finish()
    await Promise.all([first, second])
    await requestCollection(adapter, [], selection, context)
    expect(query).toHaveBeenCalledTimes(1)
  } finally {
    vi.useRealTimers()
  }
})
