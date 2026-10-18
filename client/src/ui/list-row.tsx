// ui/ListRow: rows grouped in one rounded list, like a settings screen.
export function List({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul className="list" aria-label={label}>
      {children}
    </ul>
  )
}

export function ListRow({
  leading,
  title,
  detail,
  children,
}: {
  leading?: React.ReactNode
  title: React.ReactNode
  detail?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <li className="list-row">
      {leading}
      <div className="list-row-text">
        <span className="list-row-title">{title}</span>
        {detail && <span className="caption">{detail}</span>}
      </div>
      {children && <div className="list-row-actions">{children}</div>}
    </li>
  )
}
