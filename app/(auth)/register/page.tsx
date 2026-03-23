'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'account' | 'household'>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Please enter your name'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError(null)
    setStep('household')
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!householdName.trim()) { setError('Please enter a household name'); return }
    setLoading(true)
    setError(null)

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError || !authData.user) {
      setError(signUpError?.message || 'Registration failed')
      setLoading(false)
      return
    }

    // Create household + profile + categories via secure function
    const { error: fnError } = await supabase.rpc('create_household_and_profile', {
    household_name: householdName,
    user_display_name: displayName,
    user_id: authData.user.id,
	}
)

if (fnError) {
  setError('Failed to create household: ' + fnError.message)
  setLoading(false)
  return
}

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <ShoppingBag className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Housekeeper</h1>
          <p className="text-gray-500 text-sm mt-1">Your family spending tracker</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Progress */}
          <div className="flex gap-2 mb-6">
            <div className="h-1 flex-1 rounded-full bg-indigo-500" />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step === 'household' ? 'bg-indigo-500' : 'bg-gray-200'}`} />
          </div>

          {step === 'account' ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your account</h2>
              <p className="text-sm text-gray-500 mb-6">Step 1 of 2</p>
              <form onSubmit={handleAccountStep} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Your name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Toby"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition">
                  Next
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Name your household</h2>
              <p className="text-sm text-gray-500 mb-6">Step 2 of 2</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Household name</label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g. The Chan Family"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">You can add other family members in Settings after sign-up</p>
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition">
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
                <button type="button" onClick={() => { setStep('account'); setError(null) }} className="w-full text-gray-500 py-2 text-sm hover:text-gray-700">
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
