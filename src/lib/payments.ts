import { isExpenseActiveInMonth, isInstallmentActiveInMonth } from './forecast'
import type { Account, Expense, Installment, PaymentItemType, PaymentRecord } from './types'

export type PayableItem = {
  key: string
  itemType: PaymentItemType
  itemId: string
  name: string
  subtitle: string
  amount: number
  dueDay: number | null
}

export function getPayablesForMonth({ month, expenses, installments, accounts }: {
  month: string
  expenses: Expense[]
  installments: Installment[]
  accounts: Account[]
}): PayableItem[] {
  const expenseItems: PayableItem[] = expenses
    .filter((item) => isExpenseActiveInMonth(item, month))
    .map((item) => ({
      key: `expense_${item.id}`,
      itemType: 'expense',
      itemId: item.id,
      name: item.name || 'รายจ่ายไม่ทราบชื่อ',
      subtitle: item.category || 'รายจ่ายทั่วไป',
      amount: Number.isFinite(item.amount) ? item.amount : 0,
      dueDay: item.payDay && item.payDay >= 1 && item.payDay <= 31 ? item.payDay : null,
    }))

  const installmentItems: PayableItem[] = installments
    .filter((item) => isInstallmentActiveInMonth(item, month))
    .map((item) => {
      const account = accounts.find((candidate) => candidate.id === item.accountId)
      const dueDay = item.paymentDay ?? account?.paymentDueDay ?? null
      return {
        key: `installment_${item.id}`,
        itemType: 'installment',
        itemId: item.id,
        name: item.name || 'รายการผ่อนไม่ทราบชื่อ',
        subtitle: `ผ่อนผ่าน ${account?.name || 'ไม่ทราบช่องทาง'}`,
        amount: Number.isFinite(item.monthlyAmount) ? item.monthlyAmount : 0,
        dueDay: dueDay && dueDay >= 1 && dueDay <= 31 ? dueDay : null,
      }
    })

  return [...expenseItems, ...installmentItems].sort((a, b) =>
    (a.dueDay ?? 99) - (b.dueDay ?? 99) || a.name.localeCompare(b.name, 'th'))
}

export function getPaidKeys(records: PaymentRecord[], month: string): Set<string> {
  return new Set(records
    .filter((record) => record.month === month && record.isPaid)
    .map((record) => `${record.itemType}_${record.itemId}`))
}
