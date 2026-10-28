import { useText } from '../core/i18n/useText'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { useProductSearch } from '../hooks/useProductSearch'
import { Money } from './Shared'

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useText()

  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const { results, loading, error } = useProductSearch(query)
  const visible = results.slice(0, 6)
  const navigate = useNavigate()
  const listId = useId()
  useEffect(() => {
    if (open) {
      dialog.current?.showModal()
      input.current?.focus()
    } else {
      dialog.current?.close()
      setQuery('')
      setActive(-1)
    }
  }, [open])
  const go = (slug: string) => {
    onClose()
    navigate(`/products/${slug}`)
  }
  return (
    <dialog
      ref={dialog}
      className="search-dialog"
      aria-labelledby="search-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose()
      }}
    >
      <div className="search-content">
        <div className="flex items-center justify-between gap-4">
          <h2 id="search-title">{t('Find your next favorite.')}</h2>
          <button className="icon-button" aria-label={t('Close search')} onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (active >= 0 && visible[active]) go(visible[active].slug)
            else {
              onClose()
              navigate(`/catalog?q=${encodeURIComponent(query)}`)
            }
          }}
        >
          <label className="search-field">
            <Search size={21} />
            <span className="sr-only">{t('Search products')}</span>
            <input
              ref={input}
              placeholder={t('Search products, brands, or model numbers')}
              value={query}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={visible.length > 0}
              aria-controls={listId}
              aria-activedescendant={
                active >= 0 && visible[active] ? `${listId}-${active}` : undefined
              }
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(-1)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setActive((i) => Math.min(i + 1, visible.length - 1))
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setActive((i) => Math.max(i - 1, -1))
                }
              }}
            />
            <kbd>↵</kbd>
          </label>
        </form>
        <p className="search-status" role="status">
          {loading
            ? t('Searching…')
            : error ||
              (query.trim().length < 2
                ? t('Start with a product, a brand, or a little inspiration.')
                : results.length
                  ? t('matching.count', { count: results.length })
                  : t('No matches yet. Try a product name or check your model number.'))}
        </p>
        <ul id={listId} role="listbox" aria-label={t('Product suggestions')}>
          {visible.map((product, index) => (
            <li
              key={product.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={`search-result ${index === active ? 'active' : ''}`}
              onMouseMove={() => setActive(index)}
              onClick={() => go(product.slug)}
            >
              <img src={product.images[0]} alt="" width="64" height="64" />
              <div>
                <span>{product.name}</span>
                <small>
                  {product.brand} · {product.model}
                </small>
              </div>
              <span>
                <Money amount={Math.min(...product.variants.map((v) => v.price))} />
              </span>
              <ArrowUpRight size={18} />
            </li>
          ))}
        </ul>
        {results.length > 0 && (
          <button
            className="text-link search-all"
            onClick={() => {
              onClose()
              navigate(`/catalog?q=${encodeURIComponent(query)}`)
            }}
          >
            {t('View all results')} <ArrowUpRight size={18} />
          </button>
        )}
      </div>
    </dialog>
  )
}
