'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OcrResult, OcrItem, Category, SubCategory, Profile, SubscriptionCycle, SUBSCRIPTION_CYCLES } from '@/types'
import { Camera, Upload, X, Plus, Trash2, ChevronDown, Loader2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type EditableItem = OcrItem & {
  tempId: string
  category_id: string
  sub_category_id: string
  for_member: string
  subscription_cycle: SubscriptionCycle | ''
  finalPrice: number
  finalQuantity: number
}

export default function ScanPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'capture' | 'review' | 'saving' | 'done'>('capture')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [storeName, setStoreName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [items, setItems] = useState<EditableItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<SubCategory[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)

  async function loadMetadata() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile?.household_id) return
    setHouseholdId(profile.household_id)

    const [{ data: cats }, { data: subs }, { data: mems }] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', profile.household_id).order('name'),
      supabase.from('sub_categories').select('*').eq('household_id', profile.household_id).order('name'),
      supabase.from('profiles').select('*').eq('household_id', profile.household_id).order('display_name'),
    ])
    setCategories(cats || [])
    setSubCategories(subs || [])
    setMembers(mems || [])
  }

  async function handleImageCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setOcrLoading(true)
    setOcrError(null)
    await loadMetadata()

    try {
      // Compress image and convert to base64 for reliable Vercel delivery
      const base64Image = await compressToBase64(file, 1600)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, mimeType: 'image/jpeg' }),
      })
      const result: OcrResult = await res.json()

      setStoreName(result.store_name || '')
      if (result.date) setPurchaseDate(result.date)

      const editableItems: EditableItem[] = result.items.map((item, i) => ({
        ...item,
        tempId: `item-${i}`,
        category_id: '',
        sub_category_id: '',
        for_member: '',
        subscription_cycle: '',
        finalPrice: item.unit_price || item.total_amount || 0,
        finalQuantity: item.quantity || 1,
      }))
      setItems(editableItems)
      setStep('review')
    } catch {
      setOcrError('Could not read the receipt. Please try again or add items manually.')
      setItems([])
      setStep('review')
    } finally {
      setOcrLoading(false)
    }
  }

  function updateItem(tempId: string, field: keyof EditableItem, value: any) {
    setItems((prev) => prev.map((item) => item.tempId === tempId ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems((prev) => [...prev, {
      tempId: `item-${Date.now()}`,
      description: '',
      unit_price: 0,
      total_amount: 0,
      quantity: 1,
      category_id: '',
      sub_category_id: '',
      for_member: '',
      subscription_cycle: '',
      finalPrice: 0,
      finalQuantity: 1,
    }])
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId))
  }

  async function saveReceipt() {
    if (!storeName.trim()) { alert('Please enter a store name'); return }
    if (!householdId) { alert('No household found'); return }
    setStep('saving')

    const { data: { user } } = await supabase.auth.getUser()

    const total = items.reduce((sum, item) => sum + item.finalPrice * item.finalQuantity, 0)

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        household_id: householdId,
        added_by: user!.id,
        store_name: storeName,
        purchase_date: purchaseDate,
        total_amount: total,
      })
      .select()
      .single()

    if (receiptError || !receipt) {
      alert('Failed to save receipt')
      setStep('review')
      return
    }

    const itemsToInsert = items
      .filter((item) => item.description.trim())
      .map((item) => ({
        receipt_id: receipt.id,
        household_id: householdId,
        name: item.description,
        price: item.finalPrice,
        quantity: item.finalQuantity,
        category_id: item.category_id || null,
        sub_category_id: item.sub_category_id || null,
        for_member: item.for_member || null,
        subscription_cycle: item.subscription_cycle || null,
      }))

    if (itemsToInsert.length > 0) {
      await supabase.from('receipt_items').insert(itemsToInsert)
    }

    setStep('done')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <CheckCircle size={48} className="text-emerald-500" />
        <p className="text-lg font-semibold text-gray-900">Receipt saved!</p>
        <p className="text-sm text-gray-500">Redirecting to dashboard…</p>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <Loader2 size={36} className="text-indigo-500 animate-spin" />
        <p className="text-sm text-gray-500">Saving receipt…</p>
      </div>
    )
  }

  if (step === 'capture') {
    return (
      <div className="flex flex-col min-h-screen px-4 pt-12 pb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Receipt</h1>
        <p className="text-gray-500 text-sm mb-8">Take a photo or upload an image of your receipt</p>

        {ocrLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 size={40} className="text-indigo-500 animate-spin" />
            <p className="text-gray-600 font-medium">Reading your receipt…</p>
            <p className="text-gray-400 text-sm">This takes a few seconds</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-h-[200px] border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center gap-3 bg-indigo-50 hover:bg-indigo-100 transition active:scale-98"
            >
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center">
                <Camera size={28} className="text-white" />
              </div>
              <p className="text-indigo-700 font-semibold">Take a photo</p>
              <p className="text-indigo-400 text-sm">Opens your camera</p>
            </button>

            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.removeAttribute('capture')
                  fileInputRef.current.click()
                }
              }}
              className="flex items-center justify-center gap-3 py-4 border border-gray-200 rounded-2xl bg-white hover:bg-gray-50 transition"
            >
              <Upload size={18} className="text-gray-500" />
              <span className="text-gray-700 font-medium">Upload from gallery</span>
            </button>

            <button
              onClick={async () => {
                await loadMetadata()
                setStep('review')
              }}
              className="text-center text-sm text-indigo-500 py-2"
            >
              Add items manually instead →
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageCapture}
        />
      </div>
    )
  }

  // Review step
  const total = items.reduce((sum, item) => sum + item.finalPrice * item.finalQuantity, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Review Items</h1>
        <button onClick={() => setStep('capture')} className="text-sm text-gray-500 flex items-center gap-1">
          <X size={14} /> Discard
        </button>
      </div>

      {ocrError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
          {ocrError}
        </div>
      )}

      {/* Store + Date */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Store name *
          </label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Tesco, Sainsbury's…"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
            Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <ItemCard
            key={item.tempId}
            item={item}
            categories={categories}
            subCategories={subCategories}
            members={members}
            onChange={(field, value) => updateItem(item.tempId, field, value)}
            onRemove={() => removeItem(item.tempId)}
          />
        ))}

        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-500 transition"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {/* Total + Save */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-lg font-bold text-gray-900">£{total.toFixed(2)}</span>
        </div>
        <button
          onClick={saveReceipt}
          disabled={!storeName.trim()}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition"
        >
          Save Receipt
        </button>
      </div>
    </div>
  )
}

function compressToBase64(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      resolve(dataUrl.split(',')[1]) // strip "data:image/jpeg;base64,"
    }
    img.onerror = reject
    img.src = url
  })
}

function ItemCard({ item, categories, subCategories, members, onChange, onRemove }: {
  item: EditableItem
  categories: Category[]
  subCategories: SubCategory[]
  members: Profile[]
  onChange: (field: keyof EditableItem, value: any) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const selectedCat = categories.find((c) => c.id === item.category_id)
  const filteredSubs = subCategories.filter((s) => s.category_id === item.category_id)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-2 mb-3">
          <input
            type="text"
            value={item.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Item name"
            className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 pb-1 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition mt-0.5">
            <Trash2 size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Qty</span>
            <input
              type="number"
              min="1"
              value={item.finalQuantity}
              onChange={(e) => onChange('finalQuantity', parseInt(e.target.value) || 1)}
              className="w-10 text-sm text-center border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-400">£</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.finalPrice}
              onChange={(e) => onChange('finalPrice', parseFloat(e.target.value) || 0)}
              className="w-20 text-sm border border-gray-200 rounded-lg py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-sm font-semibold text-gray-800">
            £{(item.finalPrice * item.finalQuantity).toFixed(2)}
          </span>
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400">
            <ChevronDown size={16} className={cn('transition', expanded && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
          {/* Category */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <select
              value={item.category_id}
              onChange={(e) => { onChange('category_id', e.target.value); onChange('sub_category_id', '') }}
              className="w-full text-sm border border-gray-200 rounded-xl py-2 px-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sub-category */}
          {filteredSubs.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sub-category</label>
              <select
                value={item.sub_category_id}
                onChange={(e) => onChange('sub_category_id', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl py-2 px-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select sub-category</option>
                {filteredSubs.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subscription cycle */}
          {selectedCat?.is_subscription && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Payment cycle</label>
              <div className="flex gap-2 flex-wrap">
                {SUBSCRIPTION_CYCLES.map((cycle) => (
                  <button
                    key={cycle.value}
                    onClick={() => onChange('subscription_cycle', item.subscription_cycle === cycle.value ? '' : cycle.value)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border transition',
                      item.subscription_cycle === cycle.value
                        ? 'bg-teal-500 text-white border-teal-500'
                        : 'border-gray-200 text-gray-600 hover:border-teal-300'
                    )}
                  >
                    {cycle.label}
                  </button>
                ))}
              </div>
              {item.subscription_cycle && (
                <p className="text-xs text-teal-600 mt-1.5">
                  ≈ £{(item.finalPrice / SUBSCRIPTION_CYCLES.find(c => c.value === item.subscription_cycle)!.months).toFixed(2)}/month
                </p>
              )}
            </div>
          )}

          {/* For member */}
          {members.length > 1 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">For</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => onChange('for_member', '')}
                  className={cn('text-xs px-3 py-1.5 rounded-full border transition',
                    !item.for_member ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600')}
                >
                  Everyone
                </button>
                {members.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => onChange('for_member', item.for_member === member.id ? '' : member.id)}
                    className={cn('text-xs px-3 py-1.5 rounded-full border transition',
                      item.for_member === member.id ? 'bg-indigo-500 text-white border-indigo-500' : 'border-gray-200 text-gray-600')}
                  >
                    {member.display_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
