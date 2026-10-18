import { Icon, type IconName } from './icons.tsx'

// ui/EmptyState: nothing here yet, and what to do about it.
export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <p className="empty-state-title">{title}</p>
      {text && <p className="caption">{text}</p>}
    </div>
  )
}
