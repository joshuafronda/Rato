// A white rounded panel. `label` names it for screen readers and tests.
export function Card({
  title,
  label,
  className,
  children,
}: {
  title?: React.ReactNode
  label?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={['card', className].filter(Boolean).join(' ')} aria-label={label}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}
