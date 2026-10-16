import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const resolvedSize = variant === 'icon' ? 'icon' : size
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(styles.button, styles[variant], styles[resolvedSize], className)}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
