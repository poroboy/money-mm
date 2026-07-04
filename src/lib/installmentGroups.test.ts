import { describe, expect, it } from 'vitest'
import { groupInstallmentsByAccount } from './installmentGroups'
import type { Account, Installment } from './types'

const accounts: Account[] = [
  { id: 'uob', name: 'UOB', type: 'credit_card', isActive: true },
  { id: 'kbank', name: 'KBANK', type: 'credit_card', isActive: true },
]
const installments: Installment[] = [
  { id: 'a', accountId: 'uob', name: 'Cash 3', monthlyAmount: 984, totalMonths: 7, firstPaymentMonth: '2026-08', status: 'active' },
  { id: 'b', accountId: 'uob', name: 'Cash 2', monthlyAmount: 1200, totalMonths: 6, firstPaymentMonth: '2026-08', status: 'active' },
  { id: 'c', accountId: 'kbank', name: 'มือถือ', monthlyAmount: 2000, totalMonths: 9, firstPaymentMonth: '2026-08', status: 'completed' },
  { id: 'd', accountId: 'missing', name: 'ข้อมูลเก่า', monthlyAmount: 500, totalMonths: 2, firstPaymentMonth: '2026-08', status: 'active' },
]

describe('installment grouping', () => {
  it('groups by account and puts orphaned items last', () => {
    const groups = groupInstallmentsByAccount(installments, accounts, 'name_asc')
    expect(groups.map((group) => group.accountName)).toEqual(['KBANK', 'UOB', 'ไม่พบบัญชี'])
    expect(groups[1].installments.map((item) => item.name)).toEqual(['Cash 2', 'Cash 3'])
    expect(groups[2].isOrphan).toBe(true)
  })

  it('sorts amounts and totals active installments only', () => {
    const groups = groupInstallmentsByAccount(installments, accounts, 'amount_desc')
    const uob = groups.find((group) => group.accountId === 'uob')
    expect(uob?.installments.map((item) => item.monthlyAmount)).toEqual([1200, 984])
    expect(uob?.activeMonthlyTotal).toBe(2184)
    expect(groups.find((group) => group.accountId === 'kbank')?.activeMonthlyTotal).toBe(0)
  })
})
