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

  useEffect(() => { loadReceipts() }, [])

  useEffect(() => {
    if (!search) { setFiltered(receipts); return }
    setFiltered(receipts.filter((r) =>
      r.store_name.toLowerCase().includes(search.toLowerCase())
    ))
  }, [search, receipts])

  async function loadReceipts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles').select('household_id').eq('id', user.id).single()
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
    <div className="px-5 pt-10 pb-6 lg:px-10 lg:pt-12 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <h1 className="font-serif text-4xl lg:text-5xl text-warm-900 leading-none">Receipts</h1>
        <Link
          href="/scan"
          className="w-11 h-11 bg-accent rounded-full flex items-center justify-center shadow-sm hover:bg-accent-600 transition-colors"
        >
          <ScanLine size={19} className="text-white" />
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by store…"
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-warm-200 rounded-2xl text-sm text-warm-900 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center pt-16">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center pt-20">
          <ReceiptIcon size={36} className="mx-auto text-warm-300 mb-4" />
          <p className="text-warm-500 font-medium mb-1">No receipts found</p>
          <Link href="/scan" className="text-accent text-sm hover:text-accent-600 transition-colors">
            Scan your first receipt →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-warm-200 overflow-hidden">
          {filtered.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/receipts/${receipt.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-warm-50 transition-colors border-t border-warm-100 first:border-t-0"
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
      )}
    </div>
  )
}
