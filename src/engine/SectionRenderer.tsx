import React, { lazy, Suspense, useMemo } from 'react'
import type { EngineSection } from '../core/config/contracts'
import type { Section } from '../core/schema'
import { useStore } from '../context/StoreContext'
import { SectionContent, SectionFrame, templates } from '../templates/registry'
import { designCSS } from '../core/theme/styles'
import { useEngine } from './Context'
const CollectionSection = lazy(() => import('../sections/CollectionSection'))
const ExtraSections = lazy(() => import('../sections/ExtraSections'))
const native = new Set(['hero', 'products', 'categories', 'banner', 'text', 'faq', 'benefits'])
class SectionBoundary extends React.Component<
  { children: React.ReactNode; message: string },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="section-unavailable" role="status">
        {this.props.message}
      </div>
    ) : (
      this.props.children
    )
  }
}
export function SectionRenderer({ section }: { section: EngineSection }) {
  const { config, t } = useStore(),
    engine = useEngine()
  const Custom = useMemo(() => {
    const load = engine.section(section.type)?.load
    return load ? lazy(load) : null
  }, [engine, section.type])
  if (!section.enabled) return null
  const className =
    'engine-section-' +
    Array.from(section.id)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join('-')
  return (
    <div
      className={`engine-frame ${className}`}
      id={native.has(section.type) ? undefined : section.id}
      data-section-type={section.type}
      tabIndex={-1}
    >
      {section.design && <style>{designCSS(section.design, '.' + className)}</style>}
      <SectionBoundary
        key={config.locale + section.id}
        message={t('This content is temporarily unavailable.')}
      >
        <Suspense
          fallback={
            <div className="section-loading" role="status">
              {t('Loading…')}
            </div>
          }
        >
          {native.has(section.type) ? (
            <SectionFrame section={section as unknown as Section}>
              <SectionContent
                section={section as unknown as Section}
                template={templates[section.template ?? config.template]}
              />
            </SectionFrame>
          ) : Custom ? (
            <Custom section={section} />
          ) : section.type === 'collection' ? (
            <CollectionSection section={section} />
          ) : (
            <ExtraSections section={section} />
          )}
        </Suspense>
      </SectionBoundary>
    </div>
  )
}
