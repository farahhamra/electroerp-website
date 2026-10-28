import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import { buildHead, headTags } from './head'
export function HeadManager() {
  const { config, products, categories } = useStore(),
    location = useLocation()
  useEffect(() => {
    const head = buildHead({ config, products, categories }, location.pathname, location.search)
    document.title = head.title
    document.head
      .querySelectorAll(
        '[data-engine-head],meta[name="description"],meta[name="robots"],link[rel="canonical"],link[rel="alternate"][hreflang]',
      )
      .forEach((n) => n.remove())
    const template = document.createElement('template')
    template.innerHTML = headTags(head).replace(/<title>.*?<\/title>/s, '')
    document.head.append(template.content)
  }, [config, products, categories, location.pathname, location.search])
  return null
}
