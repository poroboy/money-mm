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
  groupKey: string
  groupName: string
  groupKind: 'expense' | 'installment'
}

export type PayableGroup = {
  key: string
  name: string
  kind: 'expense' | 'installment'
  items: PayableItem[]
  total: number
}

export function getPayablesForMonth({ month, expenses, installments, accounts }: {
  month: string
  expenses: Expense[]
  installments: Installment[]
  accounts: Account[]
}): PayableItem[] {
  const expenseItems: PayableItem[] = expenses
    .filter((item) => isExpenseActiveInMonth(item, month))
    .map((item) => {
      const category = item.category?.trim() || 'รายจ่ายทั่วไป'
      return {
      key: `expense_${item.id}`,
      itemType: 'expense',
      itemId: item.id,
      name: item.name || 'รายจ่ายไม่ทราบชื่อ',
      subtitle: category,
      amount: Number.isFinite(item.amount) ? item.amount : 0,
      dueDay: item.payDay && item.payDay >= 1 && item.payDay <= 31 ? item.payDay : null,
      groupKey: `expense_${category.toLocaleLowerCase('th')}`,
      groupName: category,
      groupKind: 'expense',
    }})

  const installmentItems: PayableItem[] = installments
    .filter((item) => isInstallmentActiveInMonth(item, month))
    .map((item) => {
      const account = accounts.find((candidate) => candidate.id === item.accountId)
      const accountName = account?.name || 'ไม่ทราบช่องทาง'
      const dueDay = item.paymentDay ?? account?.paymentDueDay ?? null
      return {
        key: `installment_${item.id}`,
        itemType: 'installment',
        itemId: item.id,
        name: item.name || 'รายการผ่อนไม่ทราบชื่อ',
        subtitle: `ผ่อนผ่าน ${accountName}`,
        amount: Number.isFinite(item.monthlyAmount) ? item.monthlyAmount : 0,
        dueDay: dueDay && dueDay >= 1 && dueDay <= 31 ? dueDay : null,
        groupKey: `installment_${account?.id || 'unknown'}`,
        groupName: accountName,
        groupKind: 'installment' as const,
      }
    })

  return [...expenseItems, ...installmentItems].sort((a, b) =>
    (a.dueDay ?? 99) - (b.dueDay ?? 99) || a.name.localeCompare(b.name, 'th'))
}

export function groupPayables(items: PayableItem[]): PayableGroup[] {
  const buckets = new Map<string, PayableItem[]>()
  items.forEach((item) => buckets.set(item.groupKey, [...(buckets.get(item.groupKey) ?? []), item]))
  return [...buckets.entries()].map(([key, groupItems]) => ({
    key,
    name: groupItems[0]?.groupName || 'ไม่ทราบหมวดหมู่',
    kind: groupItems[0]?.groupKind || 'expense',
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + item.amount, 0),
  })).sort((a, b) => Number(a.kind === 'installment') - Number(b.kind === 'installment') || a.name.localeCompare(b.name, 'th', { numeric: true, sensitivity: 'base' }))
}

export function getPaidKeys(records: PaymentRecord[], month: string): Set<string> {
  return new Set(records
    .filter((record) => record.month === month && record.isPaid)
    .map((record) => `${record.itemType}_${record.itemId}`))
}
