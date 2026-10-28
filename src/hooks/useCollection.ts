import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { querySchema, type CollectionQuery } from '../core/config/contracts'
import { evaluateCollection, queryKey, type QueryResult } from '../core/collections/query'
import { requestCollection } from '../core/collections/service'
export function useCollection(input: Partial<CollectionQuery>) {
  const { config, products, provider, revision, t } = useStore()
  const query = querySchema.parse(input),
    context = {
      storeId: config.storeId,
      locale: config.locale,
      currency: config.currency,
      revision,
    }
  const key = queryKey(query, context)
  const complete = provider.mode === 'mock' || provider.capabilities?.catalog === 'complete'
  const local = useMemo(() => {
    if (!complete) return {}
    try {
      return { data: evaluateCollection(products, query, context) }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }, [products, key, complete])
  const [state, setState] = useState<{ key: string; data?: QueryResult; error?: string }>({
    key: '',
  })
  useEffect(() => {
    if (complete) return
    const controller = new AbortController()
    requestCollection(provider, products, query, context, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          window.dispatchEvent(
            new CustomEvent('storefront:diagnostics', {
              detail: [
                {
                  code: 'collection.unavailable',
                  severity: 'warning',
                  path: [],
                  pointer: '',
                  message: String(error.message),
                },
              ],
            }),
          )
          setState({ key, error: error.message })
        }
      })
    return () => controller.abort()
  }, [provider, products, key, complete])
  return {
    data: local.data ?? (state.key === key ? state.data : undefined),
    error:
      (local.error ?? (state.key === key ? state.error : undefined))
        ? t('Products are unavailable. Please try again later.')
        : undefined,
    loading: !complete && (state.key !== key || (!state.data && !state.error)),
  }
}
