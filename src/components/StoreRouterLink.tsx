import { forwardRef } from 'react'
import { Link as RouterLink, type LinkProps } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { localePath } from '../core/routing/links'
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function StoreRouterLink(
  { to, ...props },
  ref,
) {
  const { config } = useStore()
  let target = to
  if (
    config.engine &&
    typeof to === 'string' &&
    to.startsWith('/') &&
    !config.engine.i18n.locales.some(
      (l) => to === `/${l.code}` || to.startsWith(`/${l.code}/`) || to.startsWith(`/${l.code}?`),
    )
  )
    target = localePath(to, config.engine, config.locale)
  return <RouterLink to={target} {...props} ref={ref} />
})
