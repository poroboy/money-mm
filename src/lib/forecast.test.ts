import { describe, expect, it } from 'vitest'
import { addMonths, diffMonths, getForecast, getMonthlySummary, isInstallmentActiveInMonth } from './forecast'
import type { Account, Expense, Income, Installment } from './types'

const income: Income = { id: 'salary', name: 'เงินเดือน', amount: 35000, type: 'monthly', startMonth: '2026-07', isActive: true }
const expenses: Expense[] = [
  { id: 'internet', name: 'ค่าเน็ต', amount: 599, category: 'utility', type: 'forever', startMonth: '2026-07', isActive: true },
  { id: 'rent', name: 'ค่าเช่า', amount: 8000, category: 'housing', type: 'forever', startMonth: '2026-07', isActive: true },
  { id: 'once', name: 'ซื้อของ', amount: 1000, category: 'shopping', type: 'once', startMonth: '2026-07', isActive: true },
  { id: 'class', name: 'ค่าเรียน', amount: 2000, category: 'education', type: 'fixed_months', startMonth: '2026-08', repeatMonths: 3, isActive: true },
]
const accounts: Account[] = [
  { id: 'shopee', name: 'Shopee', type: 'paylater', isActive: true },
  { id: 'kbank', name: 'Kbank', type: 'credit_card', isActive: true },
]
const installments: Installment[] = [
  { id: 'a', accountId: 'shopee', name: 'ของ Shopee', monthlyAmount: 2000, totalMonths: 10, firstPaymentMonth: '2026-08', status: 'active' },
  { id: 'b', accountId: 'kbank', name: 'มือถือ', monthlyAmount: 1500, totalMonths: 6, firstPaymentMonth: '2026-09', status: 'active' },
]

describe('month utilities', () => {
  it('handles year boundaries', () => { expect(addMonths('2026-12', 1)).toBe('2027-01'); expect(diffMonths('2026-11', '2027-02')).toBe(3) })
})

describe('forecast engine', () => {
  it('matches the brief scenario', () => {
    const params = { incomes: [income], expenses, accounts, installments }
    expect(getMonthlySummary({ ...params, month: '2026-07' }).netBalance).toBe(25401)
    expect(getMonthlySummary({ ...params, month: '2026-08' }).netBalance).toBe(22401)
    expect(getMonthlySummary({ ...params, month: '2026-09' }).netBalance).toBe(20901)
    expect(getForecast({ ...params, startMonth: '2026-07', months: 12 })).toHaveLength(12)
  })
  it('stops installments after the final month', () => {
    expect(isInstallmentActiveInMonth(installments[0], '2027-05')).toBe(true)
    expect(isInstallmentActiveInMonth(installments[0], '2027-06')).toBe(false)
  })
})
