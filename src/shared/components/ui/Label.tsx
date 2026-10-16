import * as LabelPrimitive from '@radix-ui/react-label'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './label.module.css'

export const Label = forwardRef<
  HTMLLabelElement,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(styles.label, className)} {...props} />
))

Label.displayName = 'Label'
