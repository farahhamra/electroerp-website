import { useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import type { Product } from '../core/schema'

export function useProductSearch(query: string) {
  const { provider, search } = useStore()
  const [state, setState] = useState<{
    query: string
    results: Product[]
    loading: boolean
    error: string
  }>({ query: '', results: [], loading: false, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    if (query.trim().length < 2) {
      setState({ query, results: [], loading: false, error: '' })
      return () => controller.abort()
    }
    setState({ query, results: [], loading: true, error: '' })
    const timer = setTimeout(async () => {
      try {
        const results = provider.searchProducts
          ? await provider.searchProducts(query, controller.signal)
          : search(query)
        if (!controller.signal.aborted) setState({ query, results, loading: false, error: '' })
      } catch {
        if (!controller.signal.aborted)
          setState({
            query,
            results: [],
            loading: false,
            error: 'Search is unavailable. Please try again.',
          })
      }
    }, 180)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, provider, search])
  return state.query === query
    ? state
    : { query, results: [], loading: query.trim().length >= 2, error: '' }
}
