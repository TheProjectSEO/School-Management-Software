import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
}

export default function Spinner({ size = 'md', className, label }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(
          'border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin',
          sizeClasses[size],
          className
        )}
      />
      {label && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {label}
        </p>
      )}
    </div>
  )
}

export function SpinnerOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-xl">
        <Spinner size="lg" label={message} />
      </div>
    </div>
  )
}
