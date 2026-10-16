import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './separator.module.css'

export const Separator = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      styles.separator,
      orientation === 'horizontal' ? styles.horizontal : styles.vertical,
      className,
    )}
    {...props}
  />
))

Separator.displayName = 'Separator'
