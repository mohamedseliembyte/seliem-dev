import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'gold' | 'default'
}

export default function Badge({ children, className, variant = 'gold' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full tracking-wide uppercase',
        variant === 'gold' && 'bg-[#111111] text-[#c9a84c] border border-[#c9a84c] font-bold px-3 py-1.5',
        variant === 'default' && 'bg-white/10 text-white/70 border border-white/15',
        className,
      )}
    >
      {children}
    </span>
  )
}
