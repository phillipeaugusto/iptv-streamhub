import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './skeleton.module.css'

export function Skeleton({ className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.skeleton, className)} style={style} {...props} aria-hidden />
}
