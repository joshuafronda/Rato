import { useCallback, useState } from 'react'
import { adminApi, downloadUrl } from '../lib/admin-api.ts'
import { dayLabel, localDay } from '../lib/local-day.ts'
import { Badge } from '../ui/badge.tsx'
import { Button, ButtonLink } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Chip } from '../ui/chip.tsx'
import { EmptyState } from '../ui/empty-state.tsx'
import { Toggle } from '../ui/toggle.tsx'
import { ActionError, LoadState } from './loading.tsx'
import { useAction, useLoad } from './use-load.ts'

const PAGE_SIZE = 50

// Gallery moderation and downloads: every strip, shared or not, one day at a time.
export function StripsTab() {
  // null = all days. Starts on today.
  const [day, setDay] = useState<string | null>(() => localDay(new Date()))
  const [page, setPage] = useState(0)
  const days = useLoad(useCallback(() => adminApi.stripDays(), []))
  const strips = useLoad(useCallback(() => adminApi.strips(page, day), [page, day]))
  const reloadStrips = strips.reload
  const reloadDays = days.reload
  const reloadAll = useCallback(() => {
    reloadStrips()
    reloadDays()
  }, [reloadStrips, reloadDays])
  const { run, error } = useAction(reloadAll)

  const chooseDay = (next: string | null) => {
    setDay(next)
    setPage(0)
  }

  const remove = (id: number) => {
    if (window.confirm('Delete this strip and its photos? This cannot be undone.')) void run(() => adminApi.deleteStrip(id))
  }

  const dayList = days.state.status === 'ready' ? days.state.data : []
  const count = day ? (dayList.find((entry) => entry.day === day)?.strips ?? 0) : dayList.reduce((sum, entry) => sum + entry.strips, 0)
  const shownDay = day ? dayLabel(day) : 'all days'

  return (
    <>
      <Card title="Download" label="Download">
        <div className="day-picker">
          <label className="field">
            Day
            <input type="date" value={day ?? ''} onChange={(event) => chooseDay(event.target.value || null)} />
          </label>
          <div className="button-row day-chips" role="group" aria-label="Days with strips">
            <Chip selected={day === null} onClick={() => chooseDay(null)}>
              All days
            </Chip>
            {dayList.slice(0, 6).map((entry) => (
              <Chip key={entry.day} selected={day === entry.day} onClick={() => chooseDay(entry.day)}>
                {dayLabel(entry.day)} · {entry.strips}
              </Chip>
            ))}
          </div>
        </div>
        <p className="caption">
          {count} {count === 1 ? 'strip' : 'strips'} on {shownDay}. Downloads come as one .zip file.
        </p>
        {count > 0 ? (
          <div className="button-row download-row">
            <ButtonLink icon="download" href={downloadUrl(day, false)}>
              Download strips
            </ButtonLink>
            <ButtonLink variant="secondary" icon="download" href={downloadUrl(day, true)}>
              Strips + original photos
            </ButtonLink>
          </div>
        ) : (
          <Button icon="download" disabled>
            Download strips
          </Button>
        )}
      </Card>

      <LoadState state={strips.state}>
        {(list) => (
          <section className="card-form" aria-label="Strips">
            <ActionError error={error} />
            {list.length === 0 && <EmptyState icon="image" title="No strips yet." text={`Nothing was made on ${shownDay}.`} />}
            <ul className="admin-strips">
              {list.map((strip) => (
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
            {(page > 0 || list.length === PAGE_SIZE) && (
              <div className="button-row">
                <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Newer
                </Button>
                <Button variant="secondary" size="sm" disabled={list.length < PAGE_SIZE} onClick={() => setPage(page + 1)}>
                  Older
                </Button>
              </div>
            )}
          </section>
        )}
      </LoadState>
    </>
  )
}
