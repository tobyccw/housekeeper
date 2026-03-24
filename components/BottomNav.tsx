'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ScanLine, ShoppingCart, Settings, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/scan', icon: ScanLine, label: 'Scan' },
  { href: '/receipts', icon: Receipt, label: 'Receipts' },
  { href: '/shopping-list', icon: ShoppingCart, label: 'Shopping' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-warm-200 safe-bottom z-50">
      <div className="flex items-center h-[4.5rem] px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors',
                isActive ? 'text-accent' : 'text-warm-300 hover:text-warm-500'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className={cn('text-[10px]', isActive ? 'font-semibold' : 'font-normal')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
