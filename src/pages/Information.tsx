import { useText } from '../core/i18n/useText'
import { useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { StoreLink } from '../components/Shared'

export default function Information() {
  const t = useText()

  const { config, provider } = useStore()
  const { pathname } = useLocation()
  const content =
    pathname === '/shipping'
      ? {
          label: t('DELIVERED WITH CARE'),
          title: t('Good things, on their way.'),
          text: config.checkout.notice,
          extra:
            provider.mode === 'mock'
              ? 'You’re exploring a demo with sample delivery destinations and rates. No items will be shipped and no returns will be needed.'
              : '',
        }
      : pathname === '/contact'
        ? {
            label: t('A LITTLE CLOSER'),
            title: t('Always room for a conversation.'),
            text: `${config.brand.name} is ${provider.mode === 'mock' ? 'a fictional demonstration storefront' : 'here to help'}.`,
            extra:
              provider.mode === 'mock'
                ? t(
                    'Enjoy a look around. This fictional store has no customer support inbox and does not accept real purchases.',
                  )
                : t('Use the store’s contact links below for help with products or an order.'),
          }
        : {
            label: t('OUR POINT OF VIEW'),
            title: config.brand.tagline,
            text: config.brand.description,
            extra:
              'We believe the things you choose should make everyday life a little better. Considered details, useful design, and room for a little delight. That is where our story begins.',
          }
  return (
    <article className="page-width information-page">
      <span className="eyebrow">{content.label}</span>
      <h1>{content.title}</h1>
      <p className="information-lead">{content.text}</p>
      <p>{content.extra}</p>
      <StoreLink className="button primary" href="/catalog">
        {t('Explore the collection')}
        <ArrowUpRight size={18} />
      </StoreLink>
    </article>
  )
}
