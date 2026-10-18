import { useCallback } from 'react'
import { type AdminPrintJob, adminApi } from '../lib/admin-api.ts'
import { Badge, type BadgeTone } from '../ui/badge.tsx'
import { Button } from '../ui/button.tsx'
import { EmptyState } from '../ui/empty-state.tsx'
import { List, ListRow } from '../ui/list-row.tsx'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

const STATUS: Record<AdminPrintJob['status'], { text: string; tone: BadgeTone }> = {
  queued: { text: 'Waiting', tone: 'info' },
  printing: { text: 'Printing', tone: 'dark' },
  printed: { text: 'Printed', tone: 'success' },
  failed: { text: 'Failed', tone: 'danger' },
}

export function PrintsTab() {
  const { state, reload } = useLoad(useCallback(() => adminApi.printJobs(), []))
  const { run, error } = useAction(reload)

  return (
    <LoadState state={state}>
      {(jobs) => (
        <section className="card-form" aria-label="Print queue">
          <div className="admin-top">
            <p className="caption">Reprints go to the booth screen, which sends them to the printer.</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Refresh
            </Button>
          </div>
          <ActionError error={error} />
          {jobs.length === 0 ? (
            <EmptyState icon="printer" title="Nothing printed yet." />
          ) : (
            <List>
              {jobs.map((job) => (
                <ListRow
                  key={job.id}
                  leading={<img className="frame-mini" src={job.imageUrl} alt="" />}
                  title={`${job.copies} ${job.copies === 1 ? 'copy' : 'copies'}`}
                  detail={job.createdAt}
                >
                  <Badge tone={STATUS[job.status].tone}>{STATUS[job.status].text}</Badge>
                  <Button variant="secondary" size="sm" icon="printer" onClick={() => void run(() => adminApi.reprint(job.id))}>
                    Reprint
                  </Button>
                </ListRow>
              ))}
            </List>
          )}
        </section>
      )}
    </LoadState>
  )
}
