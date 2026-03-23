import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'
import { SubscriptionCycle, SUBSCRIPTION_CYCLES } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd MMM yyyy')
}

export function formatMonth(dateString: string): string {
  return format(parseISO(dateString), 'MMM yyyy')
}

export function getLast12Months(): { start: Date; end: Date; label: string }[] {
  const now = new Date()
  const months = eachMonthOfInterval({
    start: subMonths(startOfMonth(now), 11),
    end: startOfMonth(now),
  })
  return months.map((month) => ({
    start: startOfMonth(month),
    end: endOfMonth(month),
    label: format(month, 'MMM yy'),
  }))
}

export function getMonthlyAverage(price: number, cycle: SubscriptionCycle): number {
  const cycleInfo = SUBSCRIPTION_CYCLES.find((c) => c.value === cycle)
  if (!cycleInfo) return price
  return price / cycleInfo.months
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}
