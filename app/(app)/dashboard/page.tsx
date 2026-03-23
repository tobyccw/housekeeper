'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getLast12Months, formatDate } from '@/lib/utils'
import { Receipt, CategorySpending, MonthlySpending, Profile } from '@/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, Receipt as ReceiptIcon, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth } from 'date-fns'

const CHART_COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#6366f1', '#f59e0b', '#10b981']

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

    // Monthly spending for last 12 months
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

    // This month vs last month
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

    // Category breakdown this month
    const { data: categoryItems } = await supabase
      .from('receipt_items')
      .select('price, quantity, category:categories(name, color)')
      .eq('household_id', hid)
      .gte('created_at', thisStart)
      .lte('created_at', thisEnd)

    const catMap: Record<string, { total: number; color: string }> = {}
    categoryItems?.forEach((item: any) => {
      const name = item.category?.name || 'Uncategorised'
      const color = item.category?.color || '#94a3b8'
      if (!catMap[name]) catMap[name] = { total: 0, color }
      catMap[name].total += item.price * item.quantity
    })
    setCategoryData(
      Object.entries(catMap)
        .map(([category, { total, color }]) => ({ category, total, color }))
        .sort((a, b) => b.total - a.total)
    )

    // Recent receipts
    const { data: receipts } = await supabase
      .from('receipts')
      .select('*')
      .eq('household_id', hid)
      .order('purchase_date', { ascending: false })
      .limit(5)
    setRecentReceipts(receipts || [])

    setLoading(false)
  }

  const monthChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Hello, {profile?.display_name || 'there'} 👋</p>
          <h1 className="text-xl font-bold text-gray-900">
            {format(new Date(), 'MMMM yyyy')}
          </h1>
        </div>
        <Link
          href="/scan"
          className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-md shadow-indigo-200"
        >
          <Plus size={20} className="text-white" />
        </Link>
      </div>

      {/* This month summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
        <p className="text-indigo-200 text-sm font-medium">Spent this month</p>
        <p className="text-4xl font-bold mt-1">{formatCurrency(thisMonthTotal)}</p>
        {lastMonthTotal > 0 && (
          <div className="flex items-center gap-1.5 mt-3">
            <TrendingUp size={14} className={monthChange >= 0 ? 'text-red-300' : 'text-emerald-300'} />
            <p className="text-sm text-indigo-200">
              <span className={monthChange >= 0 ? 'text-red-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                {monthChange >= 0 ? '+' : ''}{monthChange.toFixed(1)}%
              </span>
              {' '}vs last month ({formatCurrency(lastMonthTotal)})
            </p>
          </div>
        )}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly spending</h2>
        {monthlyData.some((m) => m.total > 0) ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Spent']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            No spending data yet
          </div>
        )}
      </div>

      {/* Category breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">By category this month</h2>
          <div className="flex gap-4">
            <ResponsiveContainer width="50%" height={150}>
              <PieChart>
                <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 flex flex-col justify-center space-y-2">
              {categoryData.slice(0, 5).map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-gray-600 truncate max-w-[80px]">{cat.category}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent receipts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-gray-700">Recent receipts</h2>
          <Link href="/receipts" className="text-xs text-indigo-500 flex items-center gap-0.5">
            See all <ArrowRight size={12} />
          </Link>
        </div>
        {recentReceipts.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {recentReceipts.map((receipt) => (
              <Link
                key={receipt.id}
                href={`/receipts/${receipt.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition"
              >
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ReceiptIcon size={16} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{receipt.store_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(receipt.purchase_date)}</p>
                </div>
                {receipt.total_amount && (
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(receipt.total_amount)}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-5 text-center">
            <p className="text-sm text-gray-400 mb-3">No receipts yet</p>
            <Link href="/scan" className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-sm font-medium px-4 py-2 rounded-xl">
              <Plus size={14} /> Scan your first receipt
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
