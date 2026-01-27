"use client"

import { Toaster as SonnerToaster } from "sonner"

/**
 * Toast notification wrapper using Sonner
 * Place this in your root layout to enable toast notifications
 *
 * Usage:
 * import { toast } from 'sonner'
 * toast.success('Success message')
 * toast.error('Error message')
 * toast.info('Info message')
 * toast.warning('Warning message')
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme="light"
      toastOptions={{
        style: {
          fontFamily: "var(--font-lexend), sans-serif",
        },
        classNames: {
          toast: "shadow-lg border border-slate-200 dark:border-slate-700",
          title: "font-medium text-slate-900 dark:text-slate-100",
          description: "text-slate-600 dark:text-slate-400",
          actionButton: "bg-primary text-white hover:bg-[#961517]",
          cancelButton: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
          closeButton: "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
        },
      }}
    />
  )
}

export { toast } from 'sonner'
