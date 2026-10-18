import { useCallback } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

const STATUS_TEXT = { queued: 'Waiting', printing: 'Printing', printed: 'Printed', failed: 'Failed' }

export function PrintsTab() {
  const { state, reload } = useLoad(useCallback(() => adminApi.printJobs(), []))
  const { run, error } = useAction(reload)

  return (
    <LoadState state={state}>
      {(jobs) => (
        <section className="admin-section" aria-label="Print queue">
          <p className="page-note">Reprints go to the booth screen, which sends them to the printer.</p>
          <ActionError error={error} />
          {jobs.length === 0 && <p className="page-note">Nothing printed yet.</p>}
          <ul className="admin-list">
            {jobs.map((job) => (
              <li key={job.id} className="admin-item">
                <img className="admin-frame-thumb" src={job.imageUrl} alt="" />
                <span className="admin-item-name">
                  {job.copies} {job.copies === 1 ? 'copy' : 'copies'} · {job.createdAt}
                </span>
                <span className="badge">{STATUS_TEXT[job.status]}</span>
                <button type="button" className="secondary-action" onClick={() => void run(() => adminApi.reprint(job.id))}>
                  Reprint
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="secondary-action" onClick={reload}>
            Refresh
          </button>
        </section>
      )}
    </LoadState>
  )
}
