import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
}

export default function BrandLogo({ className, size = 'md' }: BrandLogoProps) {
  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      <Image
        src="/brand/logo.png"
        alt="MSU Logo"
        width={150}
        height={40}
        className="h-full w-auto object-contain"
        priority
      />
    </div>
  )
}
