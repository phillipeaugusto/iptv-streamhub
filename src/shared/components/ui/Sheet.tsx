import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { Button } from './Button'
import styles from './sheet.module.css'

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetPortal = Dialog.Portal

export function SheetOverlay({ className, ...props }: ComponentPropsWithoutRef<typeof Dialog.Overlay>) {
  return <Dialog.Overlay className={cn(styles.overlay, className)} {...props} />
}

export const SheetContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Dialog.Content> & {
    side?: 'right' | 'left' | 'bottom'
    showClose?: boolean
  }
>(({ className, children, side = 'right', showClose = true, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(styles.content, styles[side], className)}
      {...props}
    >
      {children}
      {showClose ? (
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon" className={styles.close} aria-label="Fechar">
            <X size={18} />
          </Button>
        </Dialog.Close>
      ) : null}
    </Dialog.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

export function SheetHeader({
  className,
  title,
  description,
  children,
}: {
  className?: string
  title?: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className={cn(styles.header, className)}>
      <div>
        {title ? <Dialog.Title className={styles.title}>{title}</Dialog.Title> : null}
        {description ? (
          <Dialog.Description className={styles.description}>{description}</Dialog.Description>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export function SheetBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.body, className)} {...props} />
}
