import { useCallback } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Badge } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { List, ListRow } from '../ui/list-row.tsx'
import { Toggle } from '../ui/toggle.tsx'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

export function FiltersTab() {
  const { state, reload } = useLoad(useCallback(() => adminApi.filters(), []))
  const { run, error } = useAction(reload)

  return (
    <LoadState state={state}>
      {(filters) => (
        <>
          <ActionError error={error} />
          <List label="Filters">
            {filters.map((filter) => (
              <ListRow key={filter.id} title={filter.name}>
                {filter.isDefault ? (
                  <Badge tone="success">Default</Badge>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => void run(() => adminApi.setDefaultFilter(filter.id))}>
                    Make default
                  </Button>
                )}
                <Toggle
                  label="On"
                  checked={filter.active}
                  onChange={(event) => void run(() => adminApi.setFilterActive(filter.id, event.target.checked))}
                />
              </ListRow>
            ))}
          </List>
        </>
      )}
    </LoadState>
  )
}
