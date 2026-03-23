'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Category } from '@/types'
import { Upload, FileText, CheckCircle, AlertCircle, ChevronDown, X, ArrowLeft } from 'lucide-react'
import Papa from 'papaparse'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type CsvField = 'date' | 'store' | 'item' | 'price' | 'category' | 'sub_category' | 'for_member' | 'notes' | 'skip'

const REQUIRED_FIELDS: CsvField[] = ['date', 'store', 'item', 'price']
const ALL_FIELDS: { value: CsvField; label: string; required?: boolean }[] = [
  { value: 'date', label: 'Date', required: true },
  { value: 'store', label: 'Store name', required: true },
  { value: 'item', label: 'Item name', required: true },
  { value: 'price', label: 'Price', required: true },
  { value: 'category', label: 'Category' },
  { value: 'sub_category', label: 'Sub-category' },
  { value: 'for_member', label: 'For (family member)' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '— Skip this column —' },
]

export default function ImportPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'importing' | 'done'>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [fieldMap, setFieldMap] = useState<Record<string, CsvField>>({})
  const [importCount, setImportCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Load metadata
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile?.household_id) return
    setHouseholdId(profile.household_id)
    const { data: cats } = await supabase.from('categories').select('*').eq('household_id', profile.household_id)
    setCategories(cats || [])

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) { setErrorMsg('File appears to be empty'); return }
        const headers = Object.keys(results.data[0])
        setCsvHeaders(headers)
        setCsvRows(results.data)

        // Auto-map common column names
        const autoMap: Record<string, CsvField> = {}
        headers.forEach((h) => {
          const lower = h.toLowerCase()
          if (lower.includes('date')) autoMap[h] = 'date'
          else if (lower.includes('store') || lower.includes('shop') || lower.includes('merchant')) autoMap[h] = 'store'
          else if (lower.includes('item') || lower.includes('product') || lower.includes('description') || lower.includes('name')) autoMap[h] = 'item'
          else if (lower.includes('price') || lower.includes('amount') || lower.includes('cost')) autoMap[h] = 'price'
          else if (lower.includes('category') && !lower.includes('sub')) autoMap[h] = 'category'
          else if (lower.includes('sub') || lower.includes('subcategory')) autoMap[h] = 'sub_category'
          else if (lower.includes('member') || lower.includes('for') || lower.includes('who')) autoMap[h] = 'for_member'
          else if (lower.includes('note')) autoMap[h] = 'notes'
          else autoMap[h] = 'skip'
        })
        setFieldMap(autoMap)
        setStep('map')
      },
      error: () => setErrorMsg('Failed to parse CSV file'),
    })
  }

  function getMappedValue(row: Record<string, string>, field: CsvField): string {
    const header = Object.entries(fieldMap).find(([, v]) => v === field)?.[0]
    return header ? row[header] || '' : ''
  }

  async function importData() {
    if (!householdId || !userId) return

    // Validate required fields are mapped
    for (const req of REQUIRED_FIELDS) {
      if (!Object.values(fieldMap).includes(req)) {
        setErrorMsg(`Please map the "${ALL_FIELDS.find((f) => f.value === req)?.label}" column`)
        return
      }
    }

    setStep('importing')
    let count = 0

    for (const row of csvRows) {
      const store = getMappedValue(row, 'store').trim()
      const item = getMappedValue(row, 'item').trim()
      const priceStr = getMappedValue(row, 'price').replace(/[£$,]/g, '').trim()
      const price = parseFloat(priceStr)
      const dateStr = getMappedValue(row, 'date').trim()
      const categoryName = getMappedValue(row, 'category').trim()

      if (!store || !item || isNaN(price)) continue

      // Parse date
      let purchaseDate = dateStr
      if (!dateStr || isNaN(Date.parse(dateStr))) {
        purchaseDate = new Date().toISOString().split('T')[0]
      }

      // Find or create receipt for this store+date combo
      let receipt = null
      const { data: existingReceipt } = await supabase
        .from('receipts')
        .select('id')
        .eq('household_id', householdId)
        .eq('store_name', store)
        .eq('purchase_date', purchaseDate)
        .single()

      if (existingReceipt) {
        receipt = existingReceipt
      } else {
        const { data: newReceipt } = await supabase
          .from('receipts')
          .insert({ household_id: householdId, added_by: userId, store_name: store, purchase_date: purchaseDate })
          .select()
          .single()
        receipt = newReceipt
      }

      if (!receipt) continue

      // Match category
      const cat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())

      await supabase.from('receipt_items').insert({
        receipt_id: receipt.id,
        household_id: householdId,
        name: item,
        price,
        quantity: 1,
        category_id: cat?.id || null,
        notes: getMappedValue(row, 'notes') || null,
      })
      count++
    }

    setImportCount(count)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6">
        <CheckCircle size={52} className="text-emerald-500" />
        <h2 className="text-xl font-bold text-gray-900">Import complete!</h2>
        <p className="text-gray-500 text-center">{importCount} items imported successfully</p>
        <Link href="/dashboard" className="bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl">
          View Dashboard
        </Link>
      </div>
    )
  }

  if (step === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Importing data…</p>
        <p className="text-gray-400 text-sm">Please wait</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shopping-list" className="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Import from CSV</h1>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-indigo-700">
            <p className="font-semibold mb-1">How to export from Google Sheets:</p>
            <p className="text-indigo-600">File → Download → Comma Separated Values (.csv)</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={15} /> {errorMsg}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-indigo-200 rounded-2xl py-12 flex flex-col items-center gap-3 bg-white hover:bg-indigo-50 transition"
          >
            <Upload size={32} className="text-indigo-400" />
            <p className="font-semibold text-gray-700">Tap to select CSV file</p>
            <p className="text-sm text-gray-400">Your exported Google Sheets file</p>
          </button>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected CSV format</p>
            <div className="overflow-x-auto">
              <table className="text-xs text-gray-600 w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Date', 'Store', 'Item', 'Price', 'Category', 'Notes'].map((h) => (
                      <th key={h} className="text-left py-1.5 pr-3 text-indigo-600 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 pr-3">2026-03-01</td>
                    <td className="pr-3">Tesco</td>
                    <td className="pr-3">Pork mince</td>
                    <td className="pr-3">3.99</td>
                    <td className="pr-3">Food</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-700">{csvRows.length} rows detected</p>
            </div>
            <p className="text-xs text-gray-400">Map your columns to the correct fields below</p>
          </div>

          <div className="space-y-2">
            {csvHeaders.map((header) => (
              <div key={header} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">"{header}"</p>
                  {REQUIRED_FIELDS.includes(fieldMap[header]) && (
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Required</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  Sample: {csvRows[0]?.[header] || '(empty)'}
                </p>
                <select
                  value={fieldMap[header] || 'skip'}
                  onChange={(e) => setFieldMap((prev) => ({ ...prev, [header]: e.target.value as CsvField }))}
                  className="w-full text-sm border border-gray-200 rounded-xl py-2.5 px-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALL_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}{f.required ? ' *' : ''}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <button
            onClick={importData}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3.5 rounded-xl transition"
          >
            Import {csvRows.length} rows
          </button>
          <button
            onClick={() => { setStep('upload'); setErrorMsg(null) }}
            className="w-full text-gray-500 text-sm py-2"
          >
            ← Choose different file
          </button>
        </div>
      )}
    </div>
  )
}
