import { useCallback } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

export function FiltersTab() {
  const { state, reload } = useLoad(useCallback(() => adminApi.filters(), []))
  const { run, error } = useAction(reload)

  return (
    <LoadState state={state}>
      {(filters) => (
        <section className="admin-section" aria-label="Filters">
          <ActionError error={error} />
          <ul className="admin-list">
            {filters.map((filter) => (
              <li key={filter.id} className="admin-item">
                <span className="admin-item-name">{filter.name}</span>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={filter.active}
                    onChange={(event) => void run(() => adminApi.setFilterActive(filter.id, event.target.checked))}
                  />
                  On
                </label>
                {filter.isDefault ? (
                  <span className="badge">Default</span>
                ) : (
                  <button type="button" className="secondary-action" onClick={() => void run(() => adminApi.setDefaultFilter(filter.id))}>
                    Make default
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </LoadState>
  )
}
