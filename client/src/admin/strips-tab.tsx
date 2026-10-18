import { useCallback, useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { EmptyState } from '../ui/empty-state.tsx'
import { Toggle } from '../ui/toggle.tsx'
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
        <section className="card-form" aria-label="Strips">
          <ActionError error={error} />
          {strips.length === 0 && <EmptyState icon="image" title="No strips yet." text="Strips appear here as guests make them." />}
          <ul className="admin-strips">
            {strips.map((strip) => (
              <li key={strip.id} className="admin-strip">
                <a href={`/s/${strip.shareCode}`} target="_blank" rel="noreferrer">
                  <img src={strip.imageUrl} alt={`Strip ${strip.shareCode}`} loading="lazy" />
                </a>
                <span className="caption">{strip.createdAt}</span>
                <Badge tone={strip.printCount > 0 ? 'info' : 'neutral'}>Printed {strip.printCount}</Badge>
                <Toggle
                  label="In gallery"
                  checked={strip.isPublic}
                  onChange={(event) => void run(() => adminApi.setStripPublic(strip.id, event.target.checked))}
                />
                <Button variant="destructive" size="sm" onClick={() => remove(strip.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
          {(page > 0 || strips.length === PAGE_SIZE) && (
            <div className="button-row">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Newer
              </Button>
              <Button variant="secondary" size="sm" disabled={strips.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>
                Older
              </Button>
            </div>
          )}
        </section>
      )}
    </LoadState>
  )
}
