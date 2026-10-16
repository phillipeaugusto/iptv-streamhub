import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import styles from './dialog.module.css'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay className={cn(styles.overlay, className)} {...props} />
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content className={cn(styles.content, className)} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <DialogPrimitive.Title className={cn(styles.title, className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <DialogPrimitive.Description className={cn(styles.description, className)} {...props} />
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn(styles.footer, className)}>{children}</div>
}
