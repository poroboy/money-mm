import { describe, expect, it } from 'vitest'
import { getPaidKeys, getPayablesForMonth } from './payments'
import type { Account, Expense, Installment, PaymentRecord } from './types'

const expenses: Expense[] = [
  { id: 'rent', name: 'ค่าเช่า', amount: 8000, category: 'บ้าน', type: 'forever', startMonth: '2026-07', payDay: 1, isActive: true },
  { id: 'once', name: 'ของขวัญ', amount: 500, category: 'อื่น ๆ', type: 'once', startMonth: '2026-08', isActive: true },
]
const accounts: Account[] = [{ id: 'card', name: 'Kbank', type: 'credit_card', paymentDueDay: 10, isActive: true }]
const installments: Installment[] = [{ id: 'phone', accountId: 'card', name: 'มือถือ', monthlyAmount: 1500, totalMonths: 2, firstPaymentMonth: '2026-07', status: 'active' }]

describe('monthly payables', () => {
  it('combines active expenses and installments and sorts by due date', () => {
    const items = getPayablesForMonth({ month: '2026-07', expenses, accounts, installments })
    expect(items.map((item) => item.name)).toEqual(['ค่าเช่า', 'มือถือ'])
    expect(items.map((item) => item.dueDay)).toEqual([1, 10])
  })
  it('keeps paid status scoped to its month', () => {
    const records = [{ id: 'x', itemType: 'expense', itemId: 'rent', month: '2026-07', isPaid: true }] as PaymentRecord[]
    expect(getPaidKeys(records, '2026-07').has('expense_rent')).toBe(true)
    expect(getPaidKeys(records, '2026-08').size).toBe(0)
  })
})
