'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Household, Category, AVATAR_COLORS } from '@/types'
import { LogOut, Plus, Trash2, Edit2, Check, X, Users, Tag, Home } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<Profile[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // New member form
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState(AVATAR_COLORS[1])
  const [newMemberEmail, setNewMemberEmail] = useState('')

  // New category form
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [newCatIcon, setNewCatIcon] = useState('📦')
  const [newCatSub, setNewCatSub] = useState(false)
  const [addingCat, setAddingCat] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)

    if (!profileData?.household_id) { setLoading(false); return }

    const [{ data: hh }, { data: mems }, { data: cats }] = await Promise.all([
      supabase.from('households').select('*').eq('id', profileData.household_id).single(),
      supabase.from('profiles').select('*').eq('household_id', profileData.household_id).order('display_name'),
      supabase.from('categories').select('*').eq('household_id', profileData.household_id).order('name'),
    ])
    setHousehold(hh)
    setMembers(mems || [])
    setCategories(cats || [])
    setLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function addCategory() {
    if (!newCatName.trim() || !household) return
    const { data } = await supabase
      .from('categories')
      .insert({
        household_id: household.id,
        name: newCatName.trim(),
        color: newCatColor,
        icon: newCatIcon,
        is_subscription: newCatSub,
      })
      .select()
      .single()

    if (data) {
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName('')
      setAddingCat(false)
    }
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Household */}
      <Section icon={<Home size={16} />} title="Household">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{household?.name || 'My Household'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Your family spending group</p>
        </div>
      </Section>

      {/* Family members */}
      <Section icon={<Users size={16} />} title="Family members">
        <div className="divide-y divide-gray-50">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: member.avatar_color }}
              >
                {getInitials(member.display_name)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{member.display_name}</p>
                <p className="text-xs text-gray-400 capitalize">{member.role}</p>
              </div>
              {member.id === profile?.id && (
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">You</span>
              )}
            </div>
          ))}
        </div>

        {/* Add member note */}
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
            💡 To add a family member, they need to register with the same household. Share your household name "<strong>{household?.name}</strong>" with them — household joining via invite link is coming in V2.
          </p>
        </div>
      </Section>

      {/* Categories */}
      <Section icon={<Tag size={16} />} title="Categories">
        <div className="divide-y divide-gray-50">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: cat.color + '20' }}>
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                {cat.is_subscription && (
                  <span className="text-xs text-teal-600">Subscription tracking</span>
                )}
              </div>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <button onClick={() => deleteCategory(cat.id)} className="text-gray-300 hover:text-red-400 transition p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Add category */}
        {addingCat ? (
          <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                placeholder="📦"
                className="w-12 text-center border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="flex-1 border border-gray-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                className="w-10 h-10 border border-gray-200 rounded-xl cursor-pointer"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={newCatSub}
                onChange={(e) => setNewCatSub(e.target.checked)}
                className="rounded accent-teal-500"
              />
              Track as subscription
            </label>
            <div className="flex gap-2">
              <button onClick={addCategory} disabled={!newCatName.trim()}
                className="flex-1 bg-indigo-500 disabled:bg-gray-200 text-white font-medium py-2 rounded-xl text-sm transition">
                Add
              </button>
              <button onClick={() => setAddingCat(false)} className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="flex items-center gap-2 px-4 py-3 text-sm text-indigo-500 w-full hover:bg-indigo-50 transition border-t border-gray-50"
          >
            <Plus size={15} /> Add category
          </button>
        )}
      </Section>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-200 text-red-500 rounded-2xl font-medium text-sm hover:bg-red-50 transition"
      >
        <LogOut size={16} /> Sign out
      </button>

      <p className="text-center text-xs text-gray-300 pb-2">Housekeeper v0.1.0</p>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}
