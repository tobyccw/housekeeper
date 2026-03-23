'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Receipt } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt as ReceiptIcon, Search, ScanLine } from 'lucide-react'
import Link from 'next/link'

export default function ReceiptsPage() {
  const supabase = createClient()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [filtered, setFiltered] = useState<Receipt[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceipts()
  }, [])

  useEffect(() => {
    if (!search) { setFiltered(receipts); return }
    setFiltered(receipts.filter((r) =>
      r.store_name.toLowerCase().includes(search.toLowerCase())
    ))
  }, [search, receipts])

  async function loadReceipts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile?.household_id) return

    const { data } = await supabase
      .from('receipts')
      .select('*')
      .eq('household_id', profile.household_id)
      .order('purchase_date', { ascending: false })

    setReceipts(data || [])
    setLoading(false)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <Link href="/scan" className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center shadow-md shadow-indigo-200">
          <ScanLine size={16} className="text-white" />
        </Link>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store…"
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center mt-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center mt-16">
          <ReceiptIcon size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No receipts found</p>
          <Link href="/scan" className="text-indigo-500 text-sm mt-1 inline-block">Scan your first receipt →</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/receipts/${receipt.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 transition"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <ReceiptIcon size={18} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{receipt.store_name}</p>
                <p className="text-xs text-gray-400">{formatDate(receipt.purchase_date)}</p>
              </div>
              {receipt.total_amount && (
                <p className="text-sm font-bold text-gray-800">{formatCurrency(receipt.total_amount)}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
