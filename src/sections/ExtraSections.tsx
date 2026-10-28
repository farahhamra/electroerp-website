import { MediaImage } from '../components/MediaImage'
import { useText } from '../core/i18n/useText'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, X, Play, MapPin } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { CollectionProducts } from './CollectionSection'
import { StoreLink } from '../components/Shared'
import { SectionRenderer } from '../engine/SectionRenderer'
import { resolveDestination, type Destination } from '../core/routing/links'
import type { EngineSection } from '../core/config/contracts'
import type { z } from 'zod'
import { engineLinkSchema } from '../core/config/contracts'
export function TypedLink({
  link,
  className,
}: {
  link: z.infer<typeof engineLinkSchema>
  className?: string
}) {
  const { config, products, categories } = useStore()
  const href = config.engine
    ? resolveDestination(link.destination, {
        engine: config.engine,
        locale: config.locale,
        products,
        categories,
      })
    : undefined
  return href ? (
    <StoreLink href={href} className={className}>
      {['phone', 'email', 'whatsapp'].includes(link.destination.kind) ? (
        <bdi dir="ltr">{link.label}</bdi>
      ) : (
        link.label
      )}
    </StoreLink>
  ) : (
    <span className={className} aria-disabled="true">
      {link.label}
    </span>
  )
}
export function ContactDetails({ section }: { section: EngineSection }) {
  const t = useText()

  const { config } = useStore(),
    business = config.engine!.business
  const location = business.locations.find((l) => l.id === section.locationId)
  const contacts = business.contacts.filter(
    (c) => !section.contactIds || (section.contactIds as string[]).includes(c.id),
  )
  return (
    <div className="engine-grid contact-grid">
      <div>
        {contacts.map((c) => (
          <p key={c.id}>
            <span className="eyebrow">{c.label}</span>
            <br />
            <TypedLink
              link={{
                label: c.value,
                destination: { kind: c.kind, contactId: c.id } as Destination,
              }}
            />
          </p>
        ))}
        {Boolean(section.showSocials) && (
          <nav aria-label={t('Social links')}>
            {business.socials.map((link, i) => (
              <TypedLink key={i} link={link} className="text-link" />
            ))}
          </nav>
        )}
      </div>
      {location && (
        <div>
          <h3>{location.label}</h3>
          <address dir="auto">
            {location.address.street}
            <br />
            {location.address.city}
            {location.address.region && `, ${location.address.region}`}
            <br />
            {location.address.postalCode} {location.address.country}
          </address>
          {Boolean(section.showHours) && (
            <>
              <p className="eyebrow">{location.timeZone}</p>
              <dl className="opening-hours">
                {Object.entries(location.hours).map(([day, h]) => (
                  <div key={day}>
                    <dt>
                      {new Intl.DateTimeFormat(config.locale, {
                        weekday: 'long',
                        timeZone: 'UTC',
                      }).format(
                        new Date(
                          Date.UTC(
                            2024,
                            0,
                            1 + ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(day),
                          ),
                        ),
                      )}
                    </dt>
                    <dd>
                      {h.closed
                        ? t('Closed')
                        : h.allDay
                          ? t('24 hours')
                          : h.intervals
                              .map((i) => `${i.start} – ${i.end}${i.nextDay ? ' (+1)' : ''}`)
                              .join(', ')}
                    </dd>
                  </div>
                ))}
              </dl>
              {Object.keys(location.exceptions).length > 0 && (
                <details>
                  <summary>{t('Special opening hours')}</summary>
                  {Object.entries(location.exceptions).map(([date, h]) => (
                    <p key={date}>
                      {date}:{' '}
                      {h.closed
                        ? t('Closed')
                        : h.allDay
                          ? t('24 hours')
                          : h.intervals.map((i) => `${i.start} – ${i.end}`).join(', ')}
                    </p>
                  ))}
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
function Gallery({ section }: { section: EngineSection }) {
  const t = useText()

  const { config } = useStore()
  const rtl =
    config.engine?.i18n.locales.find((locale) => locale.code === config.locale)?.direction === 'rtl'
  const items = section.items as {
    src: string
    alt: string
    caption?: string
    link?: z.infer<typeof engineLinkSchema>
  }[]
  const [active, setActive] = useState<number | null>(null),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (active !== null && !dialog.current?.open) dialog.current?.showModal()
  }, [active])
  const close = () => {
    dialog.current?.close()
    setActive(null)
    opener.current?.focus()
  }
  return (
    <>
      <div className={section.layout === 'rail' ? 'engine-rail' : 'engine-grid'}>
        {items.map((item, i) => (
          <figure key={i}>
            {section.lightbox ? (
              <button
                className="gallery-open"
                onClick={(event) => {
                  opener.current = event.currentTarget
                  setActive(i)
                }}
                aria-label={t('View {value0}', { value0: item.alt })}
              >
                <MediaImage src={item.src} alt={item.alt} width="800" height="600" loading="lazy" />
              </button>
            ) : (
              <MediaImage src={item.src} alt={item.alt} width="800" height="600" loading="lazy" />
            )}
            {item.caption && <figcaption>{item.caption}</figcaption>}
            {item.link && <TypedLink link={item.link} />}
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="engine-lightbox"
        onCancel={(e) => {
          e.preventDefault()
          close()
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close()
        }}
        onKeyDown={(e) => {
          if (active === null) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault()
            const step = (e.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1)
            setActive((active + step + items.length) % items.length)
          }
        }}
        aria-label={t('Image gallery')}
      >
        {active !== null && (
          <>
            <button
              className="icon-button lightbox-close"
              onClick={close}
              aria-label={t('Close gallery')}
            >
              <X />
            </button>
            <figure>
              <MediaImage src={items[active].src} alt={items[active].alt} />
              {items[active].caption && <figcaption>{items[active].caption}</figcaption>}
            </figure>
            <div className="lightbox-controls">
              <button
                className="icon-button"
                onClick={() => setActive((active - 1 + items.length) % items.length)}
                aria-label={t('Previous image')}
              >
                <ChevronLeft className="directional-icon" />
              </button>
              <span aria-live="polite">
                {active + 1} / {items.length}
              </span>
              <button
                className="icon-button"
                onClick={() => setActive((active + 1) % items.length)}
                aria-label={t('Next image')}
              >
                <ChevronRight className="directional-icon" />
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
function MapSection({ section }: { section: EngineSection }) {
  const t = useText()

  const { config } = useStore(),
    [loaded, setLoaded] = useState(false)
  const location = config.engine!.business.locations.find((l) => l.id === section.locationId)!
  const hasCoordinates = location.latitude !== undefined && location.longitude !== undefined
  const query = encodeURIComponent(
    `${location.address.street}, ${location.address.city}, ${location.address.country}`,
  )
  const href = location.mapUrl ?? `https://www.google.com/maps/search/?api=1&query=${query}`
  const lat = location.latitude ?? 0,
    lon = location.longitude ?? 0,
    delta = 0.02 / (Number(section.zoom) / 14)
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&layer=mapnik&marker=${lat},${lon}`
  return (
    <>
      <div className="map-panel" style={{ height: Number(section.height) }}>
        {loaded && hasCoordinates ? (
          <iframe
            src={embed}
            title={t('Map: {value0}', { value0: location.label })}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div>
            {Boolean(section.poster) && <MediaImage src={String(section.poster)} alt="" />}
            <MapPin size={32} />
            <h3>{location.label}</h3>
            <p>
              {location.address.street}, {location.address.city}
            </p>
            {Boolean(section.embed) && hasCoordinates && (
              <button className="button primary" onClick={() => setLoaded(true)}>
                {t('Load interactive map')}
              </button>
            )}
          </div>
        )}
      </div>
      <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
        {t('Open directions')}
        <ArrowUpRight size={16} />
      </a>
    </>
  )
}
function VideoSection({ section }: { section: EngineSection }) {
  const t = useText()

  const [loaded, setLoaded] = useState(false),
    source = section.source as { provider: string; url?: string; id?: string }
  const tracks = section.tracks as { src: string; language: string; label: string }[]
  return (
    <>
      <div className="video-panel">
        {source.provider === 'file' ? (
          <video controls playsInline preload="none" poster={section.poster as string | undefined}>
            {<source src={source.url} />}
            {tracks.map((t, i) => (
              <track
                key={i}
                kind="captions"
                src={t.src}
                srcLang={t.language}
                label={t.label}
                default={i === 0}
              />
            ))}
          </video>
        ) : loaded ? (
          <iframe
            src={
              source.provider === 'youtube'
                ? `https://www.youtube-nocookie.com/embed/${source.id}`
                : `https://player.vimeo.com/video/${source.id}`
            }
            title={String(section.title) || t('Video')}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button className="video-poster" onClick={() => setLoaded(true)}>
            {Boolean(section.poster) && <MediaImage src={String(section.poster)} alt="" />}
            <span>
              <Play />
              {t('Play video')}
            </span>
          </button>
        )}
      </div>
      {Boolean(section.transcript) && (
        <details>
          <summary>{t('Transcript')}</summary>
          <p>{String(section.transcript)}</p>
        </details>
      )}
    </>
  )
}
export default function ExtraSections({ section }: { section: EngineSection }) {
  const t = useText()

  let content: React.ReactNode
  if (section.type === 'columns')
    return (
      <div className="page-width engine-grid engine-columns">
        {(section.cells as { sections: EngineSection[] }[]).map((cell, i) => (
          <div className="engine-cell" key={i}>
            {cell.sections.map((s) => (
              <SectionRenderer key={s.id} section={s} />
            ))}
          </div>
        ))}
      </div>
    )
  switch (section.type) {
    case 'contact-details':
      content = <ContactDetails section={section} />
      break
    case 'map':
      content = <MapSection section={section} />
      break
    case 'gallery':
      content = <Gallery section={section} />
      break
    case 'video':
      content = <VideoSection section={section} />
      break
    case 'testimonials':
      content = (
        <div className="engine-grid">
          {(
            section.items as {
              quote: string
              name: string
              role?: string
              avatar?: string
              rating?: number
            }[]
          ).map((item, i) => (
            <figure className="testimonial" key={i}>
              {item.rating && (
                <p aria-label={t('{value0} out of 5', { value0: item.rating })}>
                  {'★'.repeat(item.rating)}
                </p>
              )}
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                {item.avatar && (
                  <MediaImage src={item.avatar} alt="" width="48" height="48" loading="lazy" />
                )}
                <span>
                  {item.name}
                  {item.role && <small>{item.role}</small>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )
      break
    case 'brand-logos':
      content = (
        <div className="engine-grid brand-logos">
          {(
            section.items as {
              name: string
              image: string
              link?: z.infer<typeof engineLinkSchema>
            }[]
          ).map((item, i) => (
            <div key={i}>
              <MediaImage
                src={item.image}
                alt={item.name}
                width="200"
                height="100"
                loading="lazy"
              />
              {item.link && <TypedLink link={item.link} />}
            </div>
          ))}
        </div>
      )
      break
    case 'comparison-table':
      content = (
        <div
          className="comparison-scroll"
          tabIndex={0}
          role="region"
          aria-label={String(section.title)}
        >
          <table>
            <caption className="sr-only">{String(section.title)}</caption>
            <thead>
              <tr>
                <th scope="col">{t('Feature')}</th>
                {(section.columns as string[]).map((s, i) => (
                  <th key={i} scope="col">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(section.rows as { label: string; values: (string | boolean)[] }[]).map((row, i) => (
                <tr key={i}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v, n) => (
                    <td key={n}>{v === true ? t('Yes') : v === false ? t('No') : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      break
    case 'promotional-collections':
      content = (
        <div className="engine-grid">
          {(
            section.items as {
              title: string
              image: string
              imageAlt: string
              link: z.infer<typeof engineLinkSchema>
              collectionId: string
              preview: boolean
            }[]
          ).map((item, i) => (
            <article className="promotion-card" key={i}>
              <MediaImage
                src={item.image}
                alt={item.imageAlt}
                width="800"
                height="600"
                loading="lazy"
              />
              <h3>{item.title}</h3>
              <TypedLink link={item.link} className="text-link" />
              {item.preview && <PromotionalProducts id={item.collectionId} />}
            </article>
          ))}
        </div>
      )
      break
    default:
      content = <p role="status">{t('This content is unavailable.')}</p>
  }
  return (
    <section className="page-width engine-content">
      {section.title || section.eyebrow || section.description ? (
        <div className="section-heading">
          <div>
            {Boolean(section.eyebrow) && <span className="eyebrow">{String(section.eyebrow)}</span>}
            {Boolean(section.title) && <h2>{String(section.title)}</h2>}
            {Boolean(section.description) && <p>{String(section.description)}</p>}
          </div>
        </div>
      ) : null}
      {content}
    </section>
  )
}

function PromotionalProducts({ id }: { id: string }) {
  const { config } = useStore()
  return <CollectionProducts query={{ ...config.engine!.collections[id], limit: 2 }} />
}
