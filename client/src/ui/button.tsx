import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { Icon, type IconName } from './icons.tsx'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface Look {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
}

function buttonClass({ variant = 'primary', size = 'md' }: Look, extra?: string): string {
  return ['btn', `btn-${variant}`, `btn-${size}`, extra].filter(Boolean).join(' ')
}

// ui/Button: primary (navy), secondary (outlined), destructive (red outline).
export function Button({ variant, size, icon, className, children, type = 'button', ...rest }: Look & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass({ variant, size }, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} />}
      {children}
    </button>
  )
}

// A link that looks like a Button (downloads, page links).
export function ButtonLink({ variant, size, icon, className, children, ...rest }: Look & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClass({ variant, size }, className)} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 18 : 20} />}
      {children}
    </a>
  )
}
