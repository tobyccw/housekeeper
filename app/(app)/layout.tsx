import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />

      {/* Main content */}
      <main className="lg:ml-60 pb-nav lg:pb-0">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
