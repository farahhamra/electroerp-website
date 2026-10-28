import * as Menu from '@radix-ui/react-dropdown-menu'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { Link } from './StoreRouterLink'

export interface MenuLink {
  label: string
  href: string
}
/** The same surface treatment for navigation; links retain native navigation behavior. */
export function NavigationDropdown({ label, items }: { label: string; items: MenuLink[] }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="navigation-dropdown-trigger">
        {label}
        <ChevronDown size={14} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="dropdown-content navigation-dropdown-content"
          sideOffset={10}
          collisionPadding={12}
          align="start"
        >
          {items.map((item) => (
            <Menu.Item key={item.href} asChild disabled={!item.href}>
              {/^(https:\/\/|tel:|mailto:)/.test(item.href) ? (
                <a className="dropdown-option" href={item.href}>
                  {item.label}
                  <ArrowUpRight size={15} />
                </a>
              ) : (
                <Link className="dropdown-option" to={item.href}>
                  {item.label}
                  <ArrowUpRight size={15} />
                </Link>
              )}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
