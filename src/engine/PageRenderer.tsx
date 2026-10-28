import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { EnginePage } from '../core/config/contracts'
import { SectionRenderer } from './SectionRenderer'
import { designCSS } from '../core/theme/styles'
export function PageRenderer({ page }: { page: EnginePage }) {
  const location = useLocation()
  useEffect(() => {
    let fragment = ''
    try {
      fragment = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    const target = new URLSearchParams(location.search).get('section') || fragment
    if (!target) return
    let cancelled = false,
      attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const scroll = () => {
      if (cancelled) return
      const node = document.getElementById(target)
      if (node && node.getClientRects().length > 0) {
        node.setAttribute('tabindex', '-1')
        node.focus({ preventScroll: true })
        node.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'start',
        })
      } else if (attempts++ < 30) timer = setTimeout(scroll, 100)
    }
    scroll()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [location, page.id])
  const className =
    'engine-page-' +
    Array.from(page.id)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join('-')
  return (
    <article className={`engine-page ${className}`} data-page-id={page.id}>
      {page.design && <style>{designCSS(page.design, '.' + className)}</style>}
      {page.heading === 'title' && (
        <div className="page-width page-intro">
          <h1>{page.title}</h1>
        </div>
      )}
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </article>
  )
}
