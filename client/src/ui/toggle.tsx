import type { InputHTMLAttributes } from 'react'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode
}

// ui/Toggle: a switch. Still a real checkbox underneath, so it works with keyboards, screen
// readers and getByLabel().
export function Toggle({ label, className, ...rest }: ToggleProps) {
  return (
    <label className={['toggle', className].filter(Boolean).join(' ')}>
      <span className="toggle-label">{label}</span>
      <input type="checkbox" role="switch" className="switch" {...rest} />
    </label>
  )
}
