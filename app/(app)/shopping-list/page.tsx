'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingListItem, Category } from '@/types'
import { Plus, Trash2, Check, ShoppingCart, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function ShoppingListPage() {
  const supabase = createClient()
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: profile } = await supabase.from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile?.household_id) return
    setHouseholdId(profile.household_id)

    const [{ data: listItems }, { data: cats }] = await Promise.all([
      supabase
        .from('shopping_list')
        .select('*, category:categories(name, color, icon)')
        .eq('household_id', profile.household_id)
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('household_id', profile.household_id).order('name'),
    ])

    setItems(listItems || [])
    setCategories(cats || [])
    setLoading(false)
  }

  async function addItem() {
    if (!newItemName.trim() || !householdId || !userId) return

    const { data } = await supabase
      .from('shopping_list')
      .insert({
        household_id: householdId,
        added_by: userId,
        name: newItemName.trim(),
        category_id: newItemCategory || null,
        quantity: 1,
        is_completed: false,
      })
      .select('*, category:categories(name, color, icon)')
      .single()

    if (data) {
      setItems((prev) => [data, ...prev])
      setNewItemName('')
      setNewItemCategory('')
    }
  }

  async function toggleItem(item: ShoppingListItem) {
    await supabase
      .from('shopping_list')
      .update({ is_completed: !item.is_completed })
      .eq('id', item.id)

    setItems((prev) =>
      prev
        .map((i) => i.id === item.id ? { ...i, is_completed: !i.is_completed } : i)
        .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
    )
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function clearCompleted() {
    const completedIds = items.filter((i) => i.is_completed).map((i) => i.id)
    if (completedIds.length === 0) return
    await supabase.from('shopping_list').delete().in('id', completedIds)
    setItems((prev) => prev.filter((i) => !i.is_completed))
  }

  const pending = items.filter((i) => !i.is_completed)
  const completed = items.filter((i) => i.is_completed)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <p className="text-sm text-gray-400">{pending.length} item{pending.length !== 1 ? 's' : ''} remaining</p>
        </div>
        {completed.length > 0 && (
          <button onClick={clearCompleted} className="text-xs text-red-400 font-medium py-1.5 px-3 border border-red-200 rounded-full">
            Clear done
          </button>
        )}
      </div>

      {/* Add item */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add an item…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={addItem}
            disabled={!newItemName.trim()}
            className="w-10 h-10 bg-indigo-500 disabled:bg-gray-200 rounded-xl flex items-center justify-center transition"
          >
            <Plus size={18} className={newItemName.trim() ? 'text-white' : 'text-gray-400'} />
          </button>
        </div>
        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-xl py-2 px-3 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center mt-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center mt-16">
          <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Your list is empty</p>
          <p className="text-gray-400 text-sm">Add items above to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending items */}
          {pending.map((item) => (
            <ShoppingItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
          ))}

          {/* Completed items */}
          {completed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2 px-1">
                Done ({completed.length})
              </p>
              {completed.map((item) => (
                <ShoppingItem key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Import link */}
      <div className="mt-6 text-center">
        <Link href="/import" className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <Upload size={12} /> Import from CSV
        </Link>
      </div>
    </div>
  )
}

function ShoppingItem({ item, onToggle, onDelete }: {
  item: ShoppingListItem
  onToggle: (item: ShoppingListItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border transition',
      item.is_completed ? 'border-gray-100 opacity-60' : 'border-gray-100'
    )}>
      <button
        onClick={() => onToggle(item)}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition',
          item.is_completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 hover:border-emerald-400'
        )}
      >
        {item.is_completed && <Check size={12} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium text-gray-900',
          item.is_completed && 'line-through text-gray-400'
        )}>
          {item.name}
        </p>
        {item.category && (
          <span
            className="text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block"
            style={{ backgroundColor: item.category.color + '20', color: item.category.color }}
          >
            {item.category.icon} {item.category.name}
          </span>
        )}
      </div>

      <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-400 transition p-1">
        <Trash2 size={15} />
      </button>
    </div>
  )
}
