import { useCallback, useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

const PAGE_SIZE = 50

// Gallery moderation: every strip, shared or not.
export function StripsTab() {
  const [page, setPage] = useState(0)
  const { state, reload } = useLoad(useCallback(() => adminApi.strips(page), [page]))
  const { run, error } = useAction(reload)

  const remove = (id: number) => {
    if (window.confirm('Delete this strip and its photos? This cannot be undone.')) void run(() => adminApi.deleteStrip(id))
  }

  return (
    <LoadState state={state}>
      {(strips) => (
        <section className="admin-section" aria-label="Strips">
          <ActionError error={error} />
          {strips.length === 0 && <p className="page-note">No strips yet.</p>}
          <ul className="admin-strips">
            {strips.map((strip) => (
              <li key={strip.id} className="admin-strip">
                <a href={`/s/${strip.shareCode}`} target="_blank" rel="noreferrer">
                  <img src={strip.imageUrl} alt={`Strip ${strip.shareCode}`} loading="lazy" />
                </a>
                <span className="page-note">
                  {strip.createdAt} · printed {strip.printCount}
                </span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={strip.isPublic}
                    onChange={(event) => void run(() => adminApi.setStripPublic(strip.id, event.target.checked))}
                  />
                  In gallery
                </label>
                <button type="button" className="secondary-action" onClick={() => remove(strip.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" className="secondary-action" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Newer
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={strips.length < PAGE_SIZE}
              onClick={() => setPage(page + 1)}
            >
              Older
            </button>
          </div>
        </section>
      )}
    </LoadState>
  )
}
