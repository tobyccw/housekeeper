'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getLast12Months, formatDate } from '@/lib/utils'
import { Receipt, CategorySpending, MonthlySpending, Profile } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Receipt as ReceiptIcon, ArrowRight, Plus, ScanLine } from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#E8C17A',
  Meal: '#E09484',
  Household: '#96BAA0',
  Homeware: '#7EA8C4',
  Subscription: '#88B8B4',
  Others: '#C0B4A8',
}

const FALLBACK_COLORS = ['#E8C17A', '#E09484', '#96BAA0', '#7EA8C4', '#88B8B4', '#C0B4A8']

function getCategoryColor(name: string, index: number, dbColor?: string) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]
  if (dbColor && dbColor !== '#6366f1') return dbColor
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([])
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([])
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([])
  const [thisMonthTotal, setThisMonthTotal] = useState(0)
  const [lastMonthTotal, setLastMonthTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(profileData)

    if (!profileData?.household_id) { setLoading(false); return }
    const hid = profileData.household_id

    const months = getLast12Months()
    const monthlyResults: MonthlySpending[] = []
    for (const month of months) {
      const { data: items } = await supabase
        .from('receipt_items')
        .select('price, quantity')
        .eq('household_id', hid)
        .gte('created_at', month.start.toISOString())
        .lte('created_at', month.end.toISOString())
      const total = items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
      monthlyResults.push({ month: month.label, total })
    }
    setMonthlyData(monthlyResults)

    const now = new Date()
    const thisStart = startOfMonth(now).toISOString()
    const thisEnd = endOfMonth(now).toISOString()
    const lastStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)).toISOString()
    const lastEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1)).toISOString()

    const { data: thisMonthItems } = await supabase
      .from('receipt_items').select('price, quantity').eq('household_id', hid)
      .gte('created_at', thisStart).lte('created_at', thisEnd)
    const { data: lastMonthItems } = await supabase
      .from('receipt_items').select('price, quantity').eq('household_id', hid)
      .gte('created_at', lastStart).lte('created_at', lastEnd)

    setThisMonthTotal(thisMonthItems?.reduce((s, i) => s + i.price * i.quantity, 0) || 0)
    setLastMonthTotal(lastMonthItems?.reduce((s, i) => s + i.price * i.quantity, 0) || 0)

    const { data: categoryItems } = await supabase
      .from('receipt_items')
      .select('price, quantity, category:categories(name, color)')
      .eq('household_id', hid)
      .gte('created_at', thisStart)
      .lte('created_at', thisEnd)

    const catMap: Record<string, { total: number; color: string }> = {}
    categoryItems?.forEach((item: any) => {
      const name = item.category?.name || 'Others'
      const color = item.category?.color || '#C0B4A8'
      if (!catMap[name]) catMap[name] = { total: 0, color }
      catMap[name].total += item.price * item.quantity
    })
    setCategoryData(
      Object.entries(catMap)
        .map(([category, { total, color }]) => ({ category, total, color }))
        .sort((a, b) => b.total - a.total)
    )

    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('household_id', hid)
      .order('purchase_date', { ascending: false })
      .limit(5)
    setRecentReceipts(receipts || [])

    setLoading(false)
  }

  const monthChange = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const currentMonth = format(new Date(), 'MMMM')
  const currentYear = format(new Date(), 'yyyy')

  return (
    <div className="px-5 pt-10 pb-6 lg:px-10 lg:pt-12 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-warm-400 mb-0.5">
            Hello, {profile?.display_name || 'there'}
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl text-warm-900 leading-none">
            {currentMonth}
            <span className="text-warm-300 ml-3 text-2xl lg:text-3xl font-serif">{currentYear}</span>
          </h1>
        </div>
        <Link
          href="/scan"
          className="w-11 h-11 bg-accent rounded-full flex items-center justify-center shadow-sm hover:bg-accent-600 transition-colors"
        >
          <ScanLine size={19} className="text-white" />
        </Link>
      </div>

      {/* ── Hero spending card ── */}
      <div className="bg-white rounded-3xl p-6 lg:p-8 border border-warm-200">
        <p className="text-xs text-warm-400 uppercase tracking-widest mb-3">Spent this month</p>
        <p className="font-serif text-5xl lg:text-6xl text-warm-900 leading-none">
          {formatCurrency(thisMonthTotal)}
        </p>
        {lastMonthTotal > 0 && (
          <div className="flex items-center gap-2 mt-4">
            {monthChange >= 0
              ? <TrendingUp size={14} className="text-red-400" />
              : <TrendingDown size={14} className="text-emerald-500" />
            }
            <span className={`text-sm font-medium ${monthChange >= 0 ? 'text-red-400' : 'text-emerald-500'}`}>
              {monthChange >= 0 ? '+' : ''}{monthChange.toFixed(1)}%
            </span>
            <span className="text-sm text-warm-400">
              vs last month · {formatCurrency(lastMonthTotal)}
            </span>
          </div>
        )}
      </div>

      {/* ── Category cards (Kakao Bank style) ── */}
      {categoryData.length > 0 && (
        <div>
          <h2 className="font-serif text-xl text-warm-900 mb-4">By category</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryData.slice(0, 6).map((cat, i) => {
              const bgColor = getCategoryColor(cat.category, i, cat.color)
              return (
                <div
                  key={i}
                  className="rounded-3xl p-5 flex flex-col justify-between min-h-[110px]"
                  style={{ backgroundColor: bgColor }}
                >
                  <p className="text-xs font-medium text-white/80 uppercase tracking-widest">
                    {cat.category}
                  </p>
                  <p className="font-serif text-2xl text-white leading-none mt-3">
                    {formatCurrency(cat.total)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 12-month chart ── */}
      <div className="bg-white rounded-3xl p-6 border border-warm-200">
        <h2 className="font-serif text-xl text-warm-900 mb-5">Monthly trend</h2>
        {monthlyData.some((m) => m.total > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#8C8C7A', fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#8C8C7A', fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Spent']}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid #E4DED4',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  fontFamily: 'Inter',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="total" fill="#C17B3C" radius={[6, 6, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-warm-400 text-sm">
            No spending data yet
          </div>
        )}
      </div>

      {/* ── Recent receipts ── */}
      <div className="bg-white rounded-3xl border border-warm-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="font-serif text-xl text-warm-900">Recent receipts</h2>
          <Link
            href="/receipts"
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-600 transition-colors"
          >
            See all <ArrowRight size={12} />
          </Link>
        </div>
        {recentReceipts.length > 0 ? (
          <div>
            {recentReceipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-warm-50 transition-colors border-t border-warm-100"
              >
                <div className="w-9 h-9 bg-accent-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ReceiptIcon size={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-900 truncate">{receipt.store_name}</p>
                  <p className="text-xs text-warm-400 mt-0.5">{formatDate(receipt.purchase_date)}</p>
                </div>
                {receipt.total_amount && (
                  <p className="text-sm font-semibold text-warm-700">{formatCurrency(receipt.total_amount)}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 pb-8 text-center">
            <p className="text-sm text-warm-400 mb-4">No receipts yet</p>
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 bg-accent-50 text-accent text-sm font-medium px-5 py-2.5 rounded-2xl hover:bg-accent-100 transition-colors"
            >
              <Plus size={14} /> Scan your first receipt
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
