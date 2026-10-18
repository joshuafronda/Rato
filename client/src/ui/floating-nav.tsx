import { Icon, type IconName } from './icons.tsx'

export interface NavItem<T extends string> {
  id: T
  label: string
  icon: IconName
}

// navigation/FloatingNav: a floating pill of icon tabs. Pinned to the bottom of the screen
// on phones; sits inline at the top on wider screens.
export function FloatingNav<T extends string>({
  items,
  current,
  onSelect,
  label,
}: {
  items: ReadonlyArray<NavItem<T>>
  current: T
  onSelect: (id: T) => void
  label: string
}) {
  return (
    <nav className="floating-nav" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="nav-item"
          aria-pressed={item.id === current}
          onClick={() => onSelect(item.id)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
