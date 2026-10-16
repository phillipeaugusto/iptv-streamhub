import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './alert.module.css'

export function Alert({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'warning' }) {
  return (
    <div
      role="alert"
      className={cn(styles.alert, styles[variant], className)}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className={cn(styles.title, className)} {...props} />
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(styles.description, className)} {...props} />
}
