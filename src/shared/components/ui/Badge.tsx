import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './badge.module.css'

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive'

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={cn(styles.badge, styles[variant], className)} {...props} />
}
