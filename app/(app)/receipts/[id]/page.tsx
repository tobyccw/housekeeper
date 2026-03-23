'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Receipt, ReceiptItem } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ArrowLeft, Store, Calendar, Receipt as ReceiptIcon,
  TrendingUp, Loader2
} from 'lucide-react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

export default function ReceiptDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [priceTrend, setPriceTrend] = useState<{ date: string; price: number; store: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceipt()
  }, [id])

  async function loadReceipt() {
    const { data: receiptData } = await supabase.from('receipts').select('*').eq('id', id).single()
    const { data: itemData } = await supabase
      .from('receipt_items')
      .select('*, category:categories(name, color, icon), sub_category:sub_categories(name), member:profiles(display_name)')
      .eq('receipt_id', id)
      .order('name')

    setReceipt(receiptData)
    setItems(itemData || [])
    setLoading(false)
  }

  async function loadPriceTrend(itemName: string) {
    if (!receipt) return
    setSelectedItem(itemName)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile) return

    const { data } = await supabase
      .from('receipt_items')
      .select('price, created_at, receipt:receipts(store_name, purchase_date)')
      .eq('household_id', profile.household_id)
      .ilike('name', `%${itemName}%`)
      .order('created_at', { ascending: true })

    const trend = (data || []).map((d: any) => ({
      date: d.receipt?.purchase_date || d.created_at.split('T')[0],
      price: d.price,
      store: d.receipt?.store_name || 'Unknown',
    }))
    setPriceTrend(trend)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!receipt) return <div className="p-4">Receipt not found</div>

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{receipt.store_name}</h1>
      </div>

      {/* Receipt info card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white mb-5 shadow-lg shadow-indigo-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-indigo-200 text-sm">{formatDate(receipt.purchase_date)}</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ReceiptIcon size={20} className="text-white" />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-indigo-200">
          <span className="flex items-center gap-1.5"><Store size={13} /> {receipt.store_name}</span>
          <span className="flex items-center gap-1.5"><Calendar size={13} /> {items.length} items</span>
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-700">Items</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: item.category.color + '20', color: item.category.color }}
                      >
                        {item.category.icon} {item.category.name}
                      </span>
                    )}
                    {item.quantity > 1 && (
                      <span className="text-xs text-gray-400">×{item.quantity}</span>
                    )}
                    {item.subscription_cycle && (
                      <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full capitalize">
                        {item.subscription_cycle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                  <button
                    onClick={() => item.name === selectedItem ? setSelectedItem(null) : loadPriceTrend(item.name)}
                    className="text-xs text-indigo-500 flex items-center gap-0.5 hover:underline"
                  >
                    <TrendingUp size={11} /> Price trend
                  </button>
                </div>
              </div>

              {/* Price trend inline */}
              {selectedItem === item.name && priceTrend.length > 1 && (
                <div className="mt-3 bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-700 mb-2">Price history for "{item.name}"</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={priceTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6366f1' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#6366f1' }} domain={['auto', 'auto']} />
                      <Tooltip
                        formatter={(v: number, _, props) => [`£${v.toFixed(2)}`, props.payload?.store]}
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {selectedItem === item.name && priceTrend.length <= 1 && (
                <p className="text-xs text-gray-400 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                  Not enough data to show a trend yet. Keep scanning receipts!
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-600">Total</span>
          <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
