import { useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { FiltersTab } from './filters-tab.tsx'
import { FramesTab } from './frames-tab.tsx'
import { OverviewTab } from './overview-tab.tsx'
import { PrintsTab } from './prints-tab.tsx'
import { SettingsTab } from './settings-tab.tsx'
import { StripsTab } from './strips-tab.tsx'

const TABS = [
  ['overview', 'Overview'],
  ['frames', 'Frames & layouts'],
  ['filters', 'Filters'],
  ['strips', 'Gallery'],
  ['prints', 'Print queue'],
  ['settings', 'Settings & backup'],
] as const

type Tab = (typeof TABS)[number][0]

export function Dashboard({ username, onSignedOut }: { username: string; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')

  const signOut = async () => {
    await adminApi.logout().catch(() => {})
    onSignedOut()
  }

  return (
    <>
      <div className="admin-bar">
        <nav className="admin-tabs" aria-label="Admin sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className="filter-chip" aria-pressed={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="secondary-action" onClick={signOut}>
          Sign out {username}
        </button>
      </div>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'frames' && <FramesTab />}
      {tab === 'filters' && <FiltersTab />}
      {tab === 'strips' && <StripsTab />}
      {tab === 'prints' && <PrintsTab />}
      {tab === 'settings' && <SettingsTab />}
    </>
  )
}
