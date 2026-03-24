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

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 bg-white border-r border-warm-200 flex-col z-50">
      {/* Wordmark */}
      <div className="px-7 pt-10 pb-8">
        <h1 className="font-serif text-2xl text-warm-900 leading-none">Housekeeper</h1>
        <p className="text-[11px] text-warm-400 mt-1.5 tracking-wide uppercase">Family spending</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors text-sm',
                isActive
                  ? 'bg-accent-50 text-accent font-medium'
                  : 'text-warm-400 hover:text-warm-900 hover:bg-warm-100'
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2 : 1.6} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-7 py-6">
        <div className="w-8 h-px bg-warm-200 mb-4" />
        <p className="text-[11px] text-warm-300">© 2026 Housekeeper</p>
      </div>
    </aside>
  )
}
