import { useState } from 'react'
import { adminApi } from '../lib/admin-api.ts'
import { Button } from '../ui/button.tsx'
import { FloatingNav, type NavItem } from '../ui/floating-nav.tsx'
import { FiltersTab } from './filters-tab.tsx'
import { FramesTab } from './frames-tab.tsx'
import { OverviewTab } from './overview-tab.tsx'
import { PrintsTab } from './prints-tab.tsx'
import { SettingsTab } from './settings-tab.tsx'
import { StripsTab } from './strips-tab.tsx'

type Tab = 'overview' | 'frames' | 'filters' | 'strips' | 'prints' | 'settings'

const TABS: ReadonlyArray<NavItem<Tab> & { title: string }> = [
  { id: 'overview', label: 'Overview', title: 'Overview', icon: 'chart' },
  { id: 'frames', label: 'Frames', title: 'Frames & layouts', icon: 'frame' },
  { id: 'filters', label: 'Filters', title: 'Filters', icon: 'sliders' },
  { id: 'strips', label: 'Gallery', title: 'Gallery', icon: 'image' },
  { id: 'prints', label: 'Prints', title: 'Print queue', icon: 'printer' },
  { id: 'settings', label: 'Settings', title: 'Settings & backup', icon: 'settings' },
]

export function Dashboard({ username, onSignedOut }: { username: string; onSignedOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const current = TABS.find((item) => item.id === tab) ?? TABS[0]

  const signOut = async () => {
    await adminApi.logout().catch(() => {})
    onSignedOut()
  }

  return (
    <>
      <div className="admin-top">
        <h1 className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Rato admin
        </h1>
        <Button variant="secondary" size="sm" icon="logout" onClick={signOut}>
          Sign out {username}
        </Button>
      </div>
      <FloatingNav label="Admin sections" items={TABS} current={tab} onSelect={setTab} />
      <h2 className="title">{current.title}</h2>
      {tab === 'overview' && <OverviewTab />}
      {tab === 'frames' && <FramesTab />}
      {tab === 'filters' && <FiltersTab />}
      {tab === 'strips' && <StripsTab />}
      {tab === 'prints' && <PrintsTab />}
      {tab === 'settings' && <SettingsTab />}
    </>
  )
}
