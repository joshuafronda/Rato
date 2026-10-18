import { useCallback } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { LoadState } from './loading.tsx'
import { useLoad } from './use-load.ts'

export function OverviewTab() {
  const { state } = useLoad(useCallback(() => adminApi.overview(), []))

  return (
    <LoadState state={state}>
      {(overview) => (
        <section className="stat-grid" aria-label="Overview">
          <Stat label="Sessions today" value={overview.sessionsToday} accent />
          <Stat label="Total strips" value={overview.totalStrips} />
          <Stat label="Prints" value={overview.totalPrints} />
          <Stat
            label="Most-used frame"
            value={overview.mostUsedFrame ? `${overview.mostUsedFrame.name} (${overview.mostUsedFrame.sessions})` : '—'}
          />
          <div className="stat">
            <span className="caption">Peak hours</span>
            {overview.peakHours.length === 0 ? (
              <span className="stat-value">—</span>
            ) : (
              <ol className="peak-hours">
                {overview.peakHours.map((peak) => (
                  <li key={peak.hour}>
                    {String(peak.hour).padStart(2, '0')}:00 · {peak.sessions} sessions
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </LoadState>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={accent ? 'stat stat-accent' : 'stat'}>
      <span className="caption">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}
