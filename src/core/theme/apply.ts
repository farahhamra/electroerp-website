import type { StoreConfig } from '../schema'
export function themeVariables(config: StoreConfig): Record<string, string> {
  const theme = config.theme
  return {
    background: theme.background,
    foreground: theme.foreground,
    accent: theme.accent,
    'accent-text': theme.accentText,
    surface: theme.surface,
    muted: theme.muted,
    'heading-font': config.locale.startsWith('ar')
      ? '"Noto Sans Arabic Variable",sans-serif'
      : JSON.stringify(theme.headingFont) + ', serif',
    'body-font': config.locale.startsWith('ar')
      ? '"Noto Sans Arabic Variable",sans-serif'
      : JSON.stringify(theme.bodyFont) + ', sans-serif',
    radius: `${theme.radius}px`,
    'content-width': `${theme.contentWidth}px`,
    'body-size': `${theme.bodySize}px`,
    'logo-width': `${config.brand.logoWidth}px`,
    ...(theme.headingWeight ? { 'heading-weight': String(theme.headingWeight) } : {}),
  }
}
export function applyTheme(config: StoreConfig) {
  const root = document.documentElement
  const previous = (root.dataset.themeKeys ?? '').split(',').filter(Boolean),
    variables = themeVariables(config)
  for (const key of previous) if (!(key in variables)) root.style.removeProperty('--' + key)
  for (const [key, value] of Object.entries(variables)) root.style.setProperty('--' + key, value)
  root.dataset.themeKeys = Object.keys(variables).join(',')
  root.dataset.motion = config.theme.motion
  if (config.theme.headingWeight) root.dataset.headingWeight = String(config.theme.headingWeight)
  else delete root.dataset.headingWeight
}
