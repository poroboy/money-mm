import type { Account, Installment } from './types'

export type InstallmentSort = 'name_asc' | 'name_desc' | 'amount_asc' | 'amount_desc'

export type InstallmentGroup = {
  accountId: string
  accountName: string
  accountType: Account['type'] | 'unknown'
  installments: Installment[]
  activeCount: number
  activeMonthlyTotal: number
  isOrphan: boolean
}

function sortItems(items: Installment[], sort: InstallmentSort) {
  const byName = (a: Installment, b: Installment) => (a.name || '').localeCompare(b.name || '', 'th', { numeric: true, sensitivity: 'base' })
  const amount = (item: Installment) => Number.isFinite(item.monthlyAmount) ? item.monthlyAmount : 0
  return [...items].sort((a, b) => {
    if (sort === 'name_asc') return byName(a, b)
    if (sort === 'name_desc') return byName(b, a)
    if (sort === 'amount_asc') return amount(a) - amount(b) || byName(a, b)
    return amount(b) - amount(a) || byName(a, b)
  })
}

export function groupInstallmentsByAccount(installments: Installment[], accounts: Account[], sort: InstallmentSort): InstallmentGroup[] {
  const accountMap = new Map(accounts.map((account) => [account.id, account]))
  const buckets = new Map<string, Installment[]>()
  installments.forEach((installment) => {
    const key = accountMap.has(installment.accountId) ? installment.accountId : '__orphan__'
    buckets.set(key, [...(buckets.get(key) ?? []), installment])
  })

  return [...buckets.entries()].map(([accountId, items]) => {
    const account = accountMap.get(accountId)
    const accountType: InstallmentGroup['accountType'] = account?.type ?? 'unknown'
    const activeItems = items.filter((item) => item.status === 'active')
    return {
      accountId,
      accountName: account?.name || 'ไม่พบบัญชี',
      accountType,
      installments: sortItems(items, sort),
      activeCount: activeItems.length,
      activeMonthlyTotal: activeItems.reduce((sum, item) => sum + (Number.isFinite(item.monthlyAmount) ? item.monthlyAmount : 0), 0),
      isOrphan: !account,
    }
  }).sort((a, b) => Number(a.isOrphan) - Number(b.isOrphan) || a.accountName.localeCompare(b.accountName, 'th', { numeric: true, sensitivity: 'base' }))
}
