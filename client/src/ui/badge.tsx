export type BadgeTone = 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'dark'

// ui/Badge: a small status pill.
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
