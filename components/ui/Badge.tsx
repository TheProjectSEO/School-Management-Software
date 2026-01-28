import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
  size?: 'sm' | 'md' | 'lg'
}

export default function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        {
          'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300': variant === 'default',
          'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400': variant === 'success',
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400': variant === 'warning',
          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400': variant === 'danger',
          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400': variant === 'info',
          'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary': variant === 'primary',
          'px-2 py-0.5 text-xs': size === 'sm',
          'px-2.5 py-0.5 text-xs': size === 'md',
          'px-3 py-1 text-sm': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
