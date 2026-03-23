export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  household_id: string
  display_name: string
  avatar_color: string
  role: 'admin' | 'member'
  created_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  color: string
  icon: string | null
  is_subscription: boolean
  created_at: string
}

export interface SubCategory {
  id: string
  category_id: string
  household_id: string
  name: string
  created_at: string
}

export interface Receipt {
  id: string
  household_id: string
  added_by: string
  store_name: string
  purchase_date: string
  total_amount: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  items?: ReceiptItem[]
  profile?: Profile
}

export interface ReceiptItem {
  id: string
  receipt_id: string
  household_id: string
  name: string
  price: number
  quantity: number
  category_id: string | null
  sub_category_id: string | null
  for_member: string | null
  subscription_cycle: SubscriptionCycle | null
  notes: string | null
  created_at: string
  category?: Category
  sub_category?: SubCategory
  member?: Profile
}

export type SubscriptionCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface ShoppingListItem {
  id: string
  household_id: string
  added_by: string
  name: string
  category_id: string | null
  quantity: number
  is_completed: boolean
  notes: string | null
  created_at: string
  category?: Category
}

export interface MonthlySpending {
  month: string
  total: number
}

export interface CategorySpending {
  category: string
  total: number
  color: string
}

export interface PriceTrendPoint {
  date: string
  price: number
  store: string
}

export interface OcrItem {
  description: string
  unit_price: number | null
  total_amount: number | null
  quantity: number | null
}

export interface OcrResult {
  store_name: string | null
  date: string | null
  total: number | null
  items: OcrItem[]
}

export interface CsvRow {
  date: string
  store: string
  item: string
  price: string
  category?: string
  sub_category?: string
  for_member?: string
  notes?: string
}

export const SUBSCRIPTION_CYCLES: { value: SubscriptionCycle; label: string; months: number }[] = [
  { value: 'weekly', label: 'Weekly', months: 0.25 },
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Quarterly', months: 3 },
  { value: 'yearly', label: 'Yearly', months: 12 },
]

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#14b8a6', '#06b6d4', '#3b82f6', '#10b981',
]

export const DEFAULT_CATEGORIES = [
  { name: 'Food', color: '#f97316', icon: '🛒', is_subscription: false },
  { name: 'Meal', color: '#ec4899', icon: '🍽️', is_subscription: false },
  { name: 'Household', color: '#8b5cf6', icon: '🏠', is_subscription: false },
  { name: 'Homeware', color: '#06b6d4', icon: '🛋️', is_subscription: false },
  { name: 'Subscription', color: '#14b8a6', icon: '📱', is_subscription: true },
  { name: 'Others', color: '#6366f1', icon: '📦', is_subscription: false },
]
