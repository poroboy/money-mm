import type { Account, Expense, Income, Installment, MonthlySummary } from './types'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH_PATTERN.test(value)
}

function parseMonth(month: string) {
  if (!isValidMonth(month)) throw new Error(`Invalid month: ${month}`)
  const [year, monthNumber] = month.split('-').map(Number)
  return { year, monthNumber }
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(month: string, count: number): string {
  const { year, monthNumber } = parseMonth(month)
  const date = new Date(Date.UTC(year, monthNumber - 1 + count, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function diffMonths(startMonth: string, targetMonth: string): number {
  const start = parseMonth(startMonth)
  const target = parseMonth(targetMonth)
  return (target.year - start.year) * 12 + target.monthNumber - start.monthNumber
}

export function isMonthInRange(targetMonth: string, startMonth: string, endMonth?: string | null): boolean {
  if (!isValidMonth(targetMonth) || !isValidMonth(startMonth) || (endMonth && !isValidMonth(endMonth))) return false
  return diffMonths(startMonth, targetMonth) >= 0 && (!endMonth || diffMonths(targetMonth, endMonth) >= 0)
}

export function getForecastMonths(startMonth: string, count: number): string[] {
  if (!isValidMonth(startMonth) || !Number.isFinite(count)) return []
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => addMonths(startMonth, index))
}

export function isIncomeActiveInMonth(income: Income, month: string): boolean {
  if (!income.isActive || !isValidMonth(income.startMonth) || !isValidMonth(month)) return false
  const index = diffMonths(income.startMonth, month)
  if (income.type === 'once') return index === 0
  if (income.type === 'monthly') return index >= 0 && (!income.endMonth || month <= income.endMonth)
  return index >= 0 && index < (income.repeatMonths ?? 0)
}

export function isExpenseActiveInMonth(expense: Expense, month: string): boolean {
  if (!expense.isActive || !isValidMonth(expense.startMonth) || !isValidMonth(month)) return false
  const index = diffMonths(expense.startMonth, month)
  if (expense.type === 'once') return index === 0
  if (expense.type === 'forever') return index >= 0
  return index >= 0 && index < (expense.repeatMonths ?? 0)
}

export function isInstallmentActiveInMonth(installment: Installment, month: string): boolean {
  if (installment.status !== 'active' || !isValidMonth(installment.firstPaymentMonth) || !isValidMonth(month) || !Number.isFinite(installment.totalMonths)) return false
  const index = diffMonths(installment.firstPaymentMonth, month)
  return index >= 0 && index < installment.totalMonths
}

export function getMonthlySummary({ month, incomes, expenses, accounts, installments }: {
  month: string; incomes: Income[]; expenses: Expense[]; accounts: Account[]; installments: Installment[]
}): MonthlySummary {
  const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0
  const incomeTotal = incomes.filter((item) => isIncomeActiveInMonth(item, month)).reduce((sum, item) => sum + amount(item.amount), 0)
  const expenseTotal = expenses.filter((item) => isExpenseActiveInMonth(item, month)).reduce((sum, item) => sum + amount(item.amount), 0)
  const activeInstallments = installments.filter((item) => isInstallmentActiveInMonth(item, month))
  const installmentTotal = activeInstallments.reduce((sum, item) => sum + amount(item.monthlyAmount), 0)
  const accountSummaries = accounts.map((account) => ({
    accountId: account.id,
    accountName: account.name || 'ไม่ทราบชื่อ',
    total: activeInstallments.filter((item) => item.accountId === account.id).reduce((sum, item) => sum + amount(item.monthlyAmount), 0),
  })).filter((item) => item.total > 0)
  return { month, incomeTotal, expenseTotal, installmentTotal, netBalance: incomeTotal - expenseTotal - installmentTotal, accountSummaries }
}

export function getForecast(params: {
  startMonth: string; months: number; incomes: Income[]; expenses: Expense[]; accounts: Account[]; installments: Installment[]
}): MonthlySummary[] {
  return getForecastMonths(params.startMonth, params.months).map((month) => getMonthlySummary({ ...params, month }))
}

export type FinancialHealthStatus = 'good' | 'ok' | 'warning' | 'danger'
export type FinancialHealth = { status: FinancialHealthStatus; label: string; message: string; burdenRatio: number; savingRatio: number }

export function getFinancialHealth(summary: MonthlySummary): FinancialHealth {
  const burdenRatio = summary.incomeTotal > 0 ? (summary.expenseTotal + summary.installmentTotal) / summary.incomeTotal : 1
  const savingRatio = summary.incomeTotal > 0 ? summary.netBalance / summary.incomeTotal : 0
  let status: FinancialHealthStatus = 'warning'
  if (summary.incomeTotal <= 0 || summary.netBalance < 0 || burdenRatio > 0.8) status = 'danger'
  else if (burdenRatio > 0.6) status = 'warning'
  else if (savingRatio >= 0.2) status = 'good'
  else if (savingRatio >= 0.1) status = 'ok'
  const copy = {
    good: ['สถานะดี', 'เดือนนี้ยังมีเงินเหลือมากกว่า 20% ของรายรับ'],
    ok: ['พอใช้', 'เดือนนี้ยังมีเงินเหลือ แต่ควรระวังรายจ่ายเพิ่ม'],
    warning: ['ควรระวัง', 'ภาระรายเดือนค่อนข้างสูง'],
    danger: ['อันตราย', 'เดือนนี้รายจ่ายมากกว่าหรือใกล้เคียงรายรับ'],
  }[status]
  return { status, label: copy[0], message: copy[1], burdenRatio, savingRatio }
}
