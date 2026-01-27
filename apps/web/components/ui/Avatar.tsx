'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  /** Image source URL */
  src?: string | null
  /** Alt text for image */
  alt?: string
  /** Name to generate initials from if no image */
  name?: string
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Additional classes */
  className?: string
  /** Show online indicator */
  showOnline?: boolean
  /** Is user online */
  isOnline?: boolean
}

/**
 * Avatar component with image fallback to initials
 */
export default function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
  showOnline = false,
  isOnline = false,
}: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  const onlineIndicatorSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className={cn(
            'rounded-full object-cover',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium text-white',
            sizes[size],
            name ? getColorFromName(name) : 'bg-slate-400'
          )}
        >
          {name ? getInitials(name) : '?'}
        </div>
      )}

      {showOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-800',
            onlineIndicatorSizes[size],
            isOnline ? 'bg-green-500' : 'bg-slate-300'
          )}
        />
      )}
    </div>
  )
}
