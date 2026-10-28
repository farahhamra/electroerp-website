import type { EngineSection } from '../../core/config/contracts'
export default function Notice({ section }: { section: EngineSection }) {
  return (
    <aside className="page-width engine-content" aria-label="Store notice">
      <p>{String(section.message)}</p>
    </aside>
  )
}
