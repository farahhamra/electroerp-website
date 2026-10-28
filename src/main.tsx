import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import './styles.css'
import './components/dropdown.css'
import './templates/templates.css'
import './templates/beauty.css'
import './templates/outdoor.css'
import './templates/customization.css'
import { createProvider } from './providers/data'
import { StorefrontApplication } from './app/App'
import './engine/engine.css'
import '@fontsource-variable/noto-sans-arabic'
import type { DataProvider, StoreData } from './core/schema'
import { templates } from './templates/registry'

const initialSnapshot = document.getElementById('store-snapshot')
let initialStore: { data: StoreData; provider: DataProvider } | null = null
function App() {
  const [store, setStore] = useState<{ data: StoreData; provider: DataProvider } | null>(
    initialStore,
  )
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const provider = await createProvider(controller.signal)
        const data = await provider.loadStore(controller.signal)
        if (controller.signal.aborted) return
        const selectedTemplates = [
          data.config.template,
          data.config.presentation.header.template,
          data.config.presentation.footer.template,
          ...data.config.sections.map((section) => section.template),
        ]
        if (selectedTemplates.some((id) => id && !Object.hasOwn(templates, id)))
          throw new Error('Unregistered template in storefront configuration.')
        if (
          initialStore?.data.revision &&
          data.revision &&
          initialStore.data.revision !== data.revision
        )
          window.dispatchEvent(
            new CustomEvent('storefront:diagnostics', {
              detail: [
                {
                  code: 'deployment.snapshot_stale',
                  severity: 'warning',
                  path: [],
                  pointer: '',
                  message:
                    'The runtime store changed. Regenerate static pages to update crawler-visible content.',
                },
              ],
            }),
          )
        setStore({ data, provider })
      } catch (error) {
        if (error && typeof error === 'object' && 'diagnostics' in error)
          window.dispatchEvent(
            new CustomEvent('storefront:diagnostics', { detail: error.diagnostics }),
          )
        if (!controller.signal.aborted)
          setError('We couldn’t load this storefront. Please check your connection and try again.')
      }
    }
    void load()
    return () => controller.abort()
  }, [])
  if (error)
    return (
      <div className="startup-state" role="alert">
        <h1>A little interruption.</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    )
  if (!store)
    return (
      <div className="startup-state" role="status">
        <span className="loading-ring" />
        <p>Something good is on its way.</p>
      </div>
    )
  return <StorefrontApplication data={store.data} provider={store.provider} />
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="startup-state" role="alert">
        <h1>Let’s try that again.</h1>
        <p>The storefront encountered an unexpected error.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload storefront
        </button>
      </div>
    ) : (
      this.props.children
    )
  }
}
async function mount() {
  if (initialSnapshot) {
    try {
      const { snapshotData, snapshotReferenceSchema } = await import('./core/seo/snapshot')
      const snapshot = JSON.parse(initialSnapshot.textContent ?? '')
      if ('configUrl' in snapshot) {
        const ref = snapshotReferenceSchema.parse(snapshot)
        const [config, catalog] = await Promise.all([
          fetch(ref.configUrl).then((r) => {
            if (!r.ok) throw new Error('Snapshot unavailable')
            return r.json()
          }),
          fetch(ref.catalogUrl).then((r) => {
            if (!r.ok) throw new Error('Snapshot unavailable')
            return r.json()
          }),
        ])
        initialStore = snapshotData({
          version: ref.version,
          locale: ref.locale,
          mode: ref.mode,
          revision: ref.revision,
          config,
          ...catalog,
        })
      } else initialStore = snapshotData(snapshot)
    } catch {
      document.getElementById('root')!.replaceChildren()
      window.dispatchEvent(
        new CustomEvent('storefront:diagnostics', {
          detail: [
            {
              code: 'deployment.snapshot_unavailable',
              severity: 'warning',
              path: [],
              pointer: '',
              message: 'Snapshot resources are unavailable; loading the current storefront.',
            },
          ],
        }),
      )
    }
  }
  const app = (
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  if (initialStore) ReactDOM.hydrateRoot(document.getElementById('root')!, app)
  else ReactDOM.createRoot(document.getElementById('root')!).render(app)
}
void mount()
