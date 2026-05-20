import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function Button({
  variant = 'gold',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-50 disabled:pointer-events-none',
        {
          'gold-gradient text-black hover:shadow-lg hover:shadow-[#c9a84c]/25 hover:scale-[1.02] active:scale-[0.98]':
            variant === 'gold',
          'border border-[#c9a84c]/60 text-[#c9a84c] hover:bg-[#c9a84c]/10 hover:border-[#c9a84c]':
            variant === 'outline',
          'text-gray-400 hover:text-white hover:bg-white/5': variant === 'ghost',
          'text-sm px-4 py-2': size === 'sm',
          'text-sm px-6 py-3': size === 'md',
          'text-base px-8 py-4': size === 'lg',
          'w-full': fullWidth,
        },
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
