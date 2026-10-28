import type { DataProvider, Product } from '../schema'
import type { CollectionQuery } from '../config/contracts'
import { evaluateCollection, queryKey, type QueryContext, type QueryResult } from './query'
type Entry = {
  promise: Promise<QueryResult>
  controller: AbortController
  subscribers: number
  settled: boolean
  expires: number
}
const caches = new WeakMap<DataProvider, Map<string, Entry>>()
// Bound remote fan-out when a page contains many distinct collections.
const queues = new WeakMap<DataProvider, { active: number; waiting: (() => void)[] }>()
function scheduled(provider: DataProvider, signal: AbortSignal, run: () => Promise<QueryResult>) {
  let queue = queues.get(provider)
  if (!queue) {
    queue = { active: 0, waiting: [] }
    queues.set(provider, queue)
  }
  const current = queue
  return new Promise<QueryResult>((resolve, reject) => {
    const abort = () => {
      const index = current.waiting.indexOf(start)
      if (index >= 0) current.waiting.splice(index, 1)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const start = () => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) {
        abort()
        return
      }
      current.active++
      Promise.resolve(run())
        .then(resolve, reject)
        .finally(() => {
          current.active--
          current.waiting.shift()?.()
        })
    }
    if (signal.aborted) {
      abort()
      return
    }
    if (current.active < 4) start()
    else {
      current.waiting.push(start)
      signal.addEventListener('abort', abort, { once: true })
    }
  })
}
export function requestCollection(
  provider: DataProvider,
  products: Product[],
  query: CollectionQuery,
  context: QueryContext,
  signal?: AbortSignal,
): Promise<QueryResult> {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  if (provider.mode === 'mock' || provider.capabilities?.catalog === 'complete')
    return Promise.resolve(evaluateCollection(products, query, context))
  if (!provider.queryProducts)
    return Promise.reject(
      new Error(
        'This catalog needs an API collection-query capability. The loaded products are only a partial selection.',
      ),
    )
  let cache = caches.get(provider)
  if (!cache) {
    cache = new Map()
    caches.set(provider, cache)
  }
  const key = queryKey(query, context)
  let entry = cache.get(key)
  if (entry && entry.settled && entry.expires < Date.now()) {
    cache.delete(key)
    entry = undefined
  }
  if (!entry) {
    const controller = new AbortController()
    entry = {
      controller,
      subscribers: 0,
      settled: false,
      expires: Date.now() + 30000,
      promise: Promise.resolve().then(() =>
        scheduled(provider, controller.signal, () =>
          provider.queryProducts!(query, context, controller.signal),
        ),
      ),
    }
    const created = entry
    created.promise = created.promise.then(
      (value) => {
        created.settled = true
        created.expires = Date.now() + 30000
        for (const [cachedKey, cached] of cache!)
          if (cache!.size > 100 && cached.settled && cachedKey !== key) cache!.delete(cachedKey)
        return value
      },
      (error) => {
        created.settled = true
        if (cache!.get(key) === created) cache!.delete(key)
        throw error
      },
    )
    cache.set(key, created)
    for (const [k, v] of cache) if (cache.size > 100 && v.settled) cache.delete(k)
  }
  const current = entry
  current.subscribers++
  return new Promise((resolve, reject) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      signal?.removeEventListener('abort', abort)
      current.subscribers--
      if (!current.settled && current.subscribers === 0) {
        current.controller.abort()
        if (cache!.get(key) === current) cache!.delete(key)
      }
    }
    const abort = () => {
      release()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    current.promise.then(
      (value) => {
        if (!released) resolve(value)
        release()
      },
      (error) => {
        if (!released) reject(error)
        release()
      },
    )
  })
}
