import { useText } from '../core/i18n/useText'
import { useStore } from '../context/StoreContext'
import { lazy, type CSSProperties, type ReactNode } from 'react'
import type { Section } from '../core/schema'
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
  beauty: lazyTemplate(() => import('./beauty').then((module) => module.beautyTemplate)),
  outdoor: lazyTemplate(() => import('./outdoor').then((module) => module.outdoorTemplate)),
}

const MediaSection = lazy(() =>
  import('./ConfigurableSections').then((m) => ({ default: m.MediaSection })),
)
const Products = lazy(() => import('./ConfigurableSections').then((m) => ({ default: m.Products })))
const Categories = lazy(() =>
  import('./ConfigurableSections').then((m) => ({ default: m.Categories })),
)
const ContentSection = lazy(() =>
  import('./ConfigurableSections').then((m) => ({ default: m.ContentSection })),
)

export function SectionFrame({ section, children }: { section: Section; children: ReactNode }) {
  const { config } = useStore()
  const { theme } = config
  const tone = section.style.tone
  const foreground =
    tone === 'accent' ? theme.accentText : tone === 'contrast' ? theme.background : theme.foreground
  const background =
    tone === 'accent' ? theme.accent : tone === 'contrast' ? theme.foreground : theme.surface
  const style = {
    ...(tone !== 'template'
      ? {
          '--background': background,
          '--foreground': foreground,
          '--surface': `color-mix(in srgb, ${foreground} 8%, ${background})`,
          '--muted': `color-mix(in srgb, ${foreground} 78%, ${background})`,
          '--border': `color-mix(in srgb, ${foreground} 20%, ${background})`,
          '--accent': foreground,
          '--accent-text': background,
        }
      : {}),
    ...('imageFit' in section
      ? {
          '--section-image-fit': section.imageFit === 'template' ? undefined : section.imageFit,
          '--section-image-position': section.imagePosition
            ? `${section.imagePosition.x}% ${section.imagePosition.y}%`
            : undefined,
        }
      : {}),
  } as CSSProperties
  return (
    <div
      id={section.id}
      className="section-frame"
      data-section-type={section.type}
      data-layout={'layout' in section ? section.layout : undefined}
      data-media-fit={'imageFit' in section ? section.imageFit : undefined}
      data-media-position={'imagePosition' in section && Boolean(section.imagePosition)}
      data-tone={tone}
      data-spacing={section.style.spacing}
      data-width={section.style.width}
      style={style}
    >
      {children}
    </div>
  )
}
export function SectionContent({
  section,
  template,
}: {
  section: Section
  template: StorefrontTemplate
}) {
  switch (section.type) {
    case 'hero':
      return section.layout === 'template' ? (
        <template.Hero section={section} />
      ) : (
        <MediaSection section={section} />
      )
    case 'banner':
      return section.layout === 'template' ? (
        <template.Banner section={section} />
      ) : (
        <MediaSection section={section} />
      )
    case 'products':
      return section.layout === 'template' ? (
        <template.Products section={section} />
      ) : (
        <Products section={section} />
      )
    case 'categories':
      return section.layout === 'template' ? (
        <template.Categories section={section} />
      ) : (
        <Categories section={section} />
      )
    default:
      return <ContentSection section={section} />
  }
}
export function HomePage() {
  const t = useText()

  const { config } = useStore()
  const template = templates[config.template]
  if (!template)
    return (
      <div className="empty-state">
        <h1>{t('Template unavailable')}</h1>
        <p>{t('This storefront configuration references an unregistered template.')}</p>
      </div>
    )
  const sections = config.sections.filter((section) => section.enabled)
  const automaticBenefits =
    !sections.some((section) => section.type === 'benefits') && config.benefits.length > 0
  return (
    <>
      {automaticBenefits && config.presentation.benefitsPosition === 'start' && (
        <template.Benefits />
      )}
      {sections.map((section) => (
        <SectionFrame key={section.id} section={section}>
          <SectionContent
            section={section}
            template={templates[section.template ?? config.template] ?? template}
          />
        </SectionFrame>
      ))}
      {automaticBenefits && config.presentation.benefitsPosition === 'end' && <template.Benefits />}
    </>
  )
}
