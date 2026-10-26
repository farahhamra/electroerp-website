import { useStore } from '../context/StoreContext'
import { lazy } from 'react'
import type { StorefrontTemplate } from './types'

// Download only the chosen template. Every slot shares the same module promise.
function lazyTemplate(loader: () => Promise<StorefrontTemplate>): StorefrontTemplate {
  let loaded: Promise<StorefrontTemplate> | undefined
  const load = () => (loaded ??= loader())
  return {
    Header: lazy(() => load().then((template) => ({ default: template.Header }))),
    Footer: lazy(() => load().then((template) => ({ default: template.Footer }))),
    Hero: lazy(() => load().then((template) => ({ default: template.Hero }))),
    Products: lazy(() => load().then((template) => ({ default: template.Products }))),
    Categories: lazy(() => load().then((template) => ({ default: template.Categories }))),
    Banner: lazy(() => load().then((template) => ({ default: template.Banner }))),
    Benefits: lazy(() => load().then((template) => ({ default: template.Benefits }))),
  }
}

export const templates: Record<string, StorefrontTemplate> = {
  electronics: lazyTemplate(() =>
    import('./electronics').then((module) => module.electronicsTemplate),
  ),
  fashion: lazyTemplate(() => import('./fashion').then((module) => module.fashionTemplate)),
  home: lazyTemplate(() => import('./home').then((module) => module.homeTemplate)),
}

export function HomePage() {
  const { config } = useStore()
  const template = templates[config.template]
  if (!template)
    return (
      <div className="empty-state">
        <h1>Template unavailable</h1>
        <p>This storefront configuration references an unregistered template.</p>
      </div>
    )
  return (
    <>
      {config.sections.map((section) => {
        switch (section.type) {
          case 'hero':
            return <template.Hero key={section.id} section={section} />
          case 'products':
            return <template.Products key={section.id} section={section} />
          case 'categories':
            return <template.Categories key={section.id} section={section} />
          case 'banner':
            return <template.Banner key={section.id} section={section} />
        }
      })}
      <template.Benefits />
    </>
  )
}
