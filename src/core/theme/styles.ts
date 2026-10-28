import type { Design, Tokens } from '../config/contracts'
export type Device = 'mobile' | 'tablet' | 'desktop'
export function resolveResponsive<T extends object>(
  layers: ({ base?: T; mobile?: T; tablet?: T; desktop?: T } | undefined)[],
  device: Device,
): Partial<T> {
  return Object.assign({}, ...layers.flatMap((layer) => [layer?.base ?? {}, layer?.[device] ?? {}]))
}
const cssName = (s: string) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
const roles: Record<string, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p,li',
  lead: '.information-lead,.detail-description',
  caption: 'figcaption,.product-options',
  eyebrow: '.eyebrow',
  button: '.button,button',
  navigation: 'nav a,nav button,.navigation-dropdown-trigger,.navigation-dropdown-content',
  input: 'input,textarea,.dropdown-trigger',
}
const media = {
  base: '',
  mobile: '(max-width:767px)',
  tablet: '(min-width:768px) and (max-width:1023px)',
  desktop: '(min-width:1024px)',
}
const wrap = (key: string, css: string) =>
  key === 'base' ? css : `@media ${media[key as keyof typeof media]}{${css}}`
function rule(selector: string, values: Record<string, unknown>) {
  return `${selector}{${Object.entries(values)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}!important`)
    .join(';')}}`
}
export function tokenCSS(tokens: Tokens | undefined, scope: string) {
  if (!tokens) return ''
  let css = rule(
    scope,
    Object.fromEntries(
      Object.entries(tokens.palette ?? {}).map(([key, v]) => ['--' + cssName(key), v]),
    ),
  )
  if (tokens.palette?.focus)
    css += rule(`${scope} :where(button,a,input,textarea,summary):focus-visible`, {
      'outline-color': tokens.palette.focus,
    })
  if (tokens.radius !== undefined) css += rule(scope, { '--radius': tokens.radius + 'px' })
  if (tokens.spacing)
    css += rule(
      scope,
      Object.fromEntries(
        Object.entries(tokens.spacing).map(([k, v]) => ['--space-' + k, `${v}rem`]),
      ),
    )
  const spacingTargets: Record<string, [string, string]> = {
    xs: ['.button,.section-actions,.icon-button', 'gap'],
    sm: ['.variant-options,.thumbnails,.form-grid', 'gap'],
    md: ['.product-grid,.engine-grid,.config-products-grid,.config-categories-grid', 'gap'],
    lg: ['.section-heading,.config-section-heading', 'margin-block-end'],
    xl: ['.section,.engine-content,.config-products,.config-categories', 'padding-block'],
  }
  for (const [key, value] of Object.entries(tokens.spacing ?? {})) {
    const [selectors, property] = spacingTargets[key]
    css += rule(
      selectors
        .split(',')
        .map((selector) => `${scope} :where(${selector})`)
        .join(','),
      { [property]: `${value}rem` },
    )
  }
  if (tokens.shadow)
    css += rule(scope, {
      '--engine-shadow': {
        none: 'none',
        soft: '0 8px 30px #0000000d',
        raised: '0 20px 60px #00000020',
      }[tokens.shadow],
    })
  for (const [role, settings] of Object.entries(tokens.typography ?? {}))
    for (const [device, value] of Object.entries(settings)) {
      if (!value) continue
      const targets = roles[role]
        .split(',')
        .map((s) => `${scope} :where(${s})`)
        .join(',')
      css += wrap(
        device,
        rule(targets, {
          'font-family': value.font
            ? ((
                {
                  body: 'var(--body-font)',
                  heading: 'var(--heading-font)',
                  arabic: '"Noto Sans Arabic Variable",sans-serif',
                } as Record<string, string>
              )[value.font] ?? `var(--font-${value.font},var(--body-font))`)
            : undefined,
          'font-size': value.size === undefined ? undefined : `${value.size}rem`,
          'font-weight': value.weight,
          'line-height': value.lineHeight,
          'letter-spacing':
            value.letterSpacing === undefined ? undefined : `${value.letterSpacing}em`,
          'text-transform': value.transform,
        }),
      )
    }
  const components: Record<string, string> = {
    button: '.button',
    input: 'input,textarea',
    card: '.product-card',
    dropdown: '.dropdown-content,.navigation-dropdown-content',
    header: 'header',
    footer: 'footer',
  }
  for (const [name, value] of Object.entries(tokens.components ?? {}))
    if (value) {
      const target = components[name]
        .split(',')
        .map((s) => `${scope} ${s}`)
        .join(',')
      css += rule(target, {
        'border-radius': value.radius === undefined ? undefined : value.radius + 'px',
        background: value.background,
        color: value.color,
        'border-color': value.border,
        padding: value.padding === undefined ? undefined : value.padding + 'rem',
      })
      if (value.hoverBackground)
        css += rule(
          target
            .split(',')
            .map((s) => `${s}:hover`)
            .join(','),
          { background: value.hoverBackground },
        )
      if (value.focusColor)
        css += rule(
          target
            .split(',')
            .map((s) => `${s}:focus-visible`)
            .join(','),
          { 'outline-color': value.focusColor },
        )
      if (value.disabledOpacity !== undefined)
        css += rule(
          target
            .split(',')
            .map((s) => `${s}:disabled`)
            .join(','),
          { opacity: value.disabledOpacity },
        )
    }
  return css
}
export function designCSS(design: Design | undefined, scope: string) {
  if (!design) return ''
  let css = tokenCSS(design.tokens, scope)
  for (const [device, v] of Object.entries(design.layout ?? {}))
    if (v) {
      css += wrap(
        device,
        rule(scope, {
          '--engine-columns': v.columns,
          '--engine-tracks': v.proportions?.map((n) => `${n}fr`).join(' '),
          '--engine-gap': v.gap === undefined ? undefined : `${v.gap}rem`,
          'padding-block': v.paddingBlock === undefined ? undefined : `${v.paddingBlock}rem`,
          'padding-inline': v.paddingInline === undefined ? undefined : `${v.paddingInline}rem`,
          'max-width': v.maxWidth === undefined ? undefined : `${v.maxWidth}rem`,
          'text-align': v.align,
          '--engine-align': v.verticalAlign,
          display: v.visible === false ? 'none' : v.visible === true ? 'block' : undefined,
          '--engine-image-ratio': v.imageRatio,
          '--engine-image-order':
            v.imageSide === 'start' ? -1 : v.imageSide === 'end' ? 1 : undefined,
        }),
      )
    }
  const gridSelectors =
    '.product-grid,.home-favorites-grid,.fashion-product-edit,.beauty-product-shelf,.outdoor-equipment-grid,.tech-category-grid,.fashion-collection-grid,.beauty-ritual-grid,.outdoor-route-grid,.config-products-grid,.config-categories-grid,.engine-grid'
  const mediaSelectors =
    '.hero,.beauty-hero,.home-journal,.fashion-story,.outdoor-dispatch,.beauty-note,.config-media'
  for (const [device, value] of Object.entries(design.layout ?? {})) {
    if (!value) continue
    const targets = (selectors: string) =>
      selectors
        .split(',')
        .map((selector) => `${scope} ${selector}`)
        .join(',')
    if (value.columns !== undefined || value.proportions)
      css += wrap(
        device,
        rule(targets(gridSelectors), {
          'grid-template-columns':
            value.proportions?.map((n) => `${n}fr`).join(' ') ??
            `repeat(${value.columns},minmax(0,1fr))`,
        }),
      )
    if (value.gap !== undefined)
      css += wrap(
        device,
        rule(targets(gridSelectors + ',' + mediaSelectors), { gap: value.gap + 'rem' }),
      )
    if (value.imageSide)
      css += wrap(
        device,
        rule(
          targets(
            '.hero-art,.beauty-hero-art,.home-journal-image,.fashion-story-image,.outdoor-dispatch-image,.beauty-note-image,.config-media-image',
          ),
          { order: value.imageSide === 'start' ? -1 : 1 },
        ),
      )
    if (value.imageRatio !== undefined)
      css += wrap(
        device,
        rule(targets('[data-section-image],.engine-grid img,.engine-rail img'), {
          'aspect-ratio': value.imageRatio,
        }),
      )
    if (value.proportions)
      css += wrap(
        device,
        rule(targets(mediaSelectors), {
          'grid-template-columns': value.proportions.map((n) => `${n}fr`).join(' '),
        }),
      )
  }
  if (design.background) {
    const b = design.background
    css += rule(scope, {
      background: b.color,
      'background-image': b.image
        ? `${
            b.overlay
              ? `linear-gradient(#000000${Math.round(b.overlay * 255)
                  .toString(16)
                  .padStart(2, '0')},#000000${Math.round(b.overlay * 255)
                  .toString(16)
                  .padStart(2, '0')}),`
              : ''
          }url(${JSON.stringify(b.image)})`
        : undefined,
      'background-size': b.image ? 'cover' : undefined,
      'background-position': b.position,
    })
  }
  return css
}
