import { getCurrentMonth, getMonthlySummary, getForecast, getFinancialHealth, isExpenseActiveInMonth, isInstallmentActiveInMonth } from '../forecast'
import { getBudgetCoaching, getRiskDetection } from './snapshot'
import { money } from '../format'
import type { DataValue } from '../../context/DataContext'

export function buildFinancialContext(data: DataValue): string {
  const month = getCurrentMonth()
  const summary = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
  const totalExpense = summary.expenseTotal + summary.installmentTotal
  const savings = Math.max(0, summary.netBalance)
  const savingsRate = summary.incomeTotal > 0 ? (savings / summary.incomeTotal) * 100 : 0
  const health = getFinancialHealth(summary)

  const lines: string[] = []
  lines.push(`[สถานะการเงินเดือน ${month}]`)
  lines.push(`รายรับ: ${money(summary.incomeTotal)}`)
  lines.push(`รายจ่าย: ${money(totalExpense)} (ค่าผ่อน ${money(summary.installmentTotal)})`)
  lines.push(`คงเหลือ: ${money(summary.netBalance)}`)
  lines.push(`ออม: ${savingsRate.toFixed(0)}%`)
  lines.push(`สุขภาพ: ${health.label} (${health.message})`)

  if (data.savingsGoals.length > 0) {
    const activeGoals = data.savingsGoals.filter((g) => g.status === 'active')
    if (activeGoals.length > 0) {
      lines.push('')
      lines.push('[เป้าหมาย]')
      for (const g of activeGoals) {
        const pct = g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(0) : '0'
        lines.push(`- ${g.name}: ${money(g.savedAmount)} / ${money(g.targetAmount)} (${pct}%) ครบ ${g.targetMonth}`)
      }
    }
  }

  const snapshotInput = { incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments, paymentRecords: data.paymentRecords, savingsGoals: data.savingsGoals }

  const budgetCoaching = getBudgetCoaching(snapshotInput)
  if (budgetCoaching.overspendCategories.length > 0) {
    lines.push('')
    lines.push('[งบประมาณที่เกิน]')
    for (const oc of budgetCoaching.overspendCategories.slice(0, 4)) {
      lines.push(`- ${oc.category}: ใช้ ${money(oc.currentSpending)} / งบ ${money(oc.suggestedBudget)} (${oc.percentageOver}% เกิน ${money(oc.overspendAmount)})`)
    }
  }

  const risk = getRiskDetection(snapshotInput)
  if (risk.risks.length > 0) {
    lines.push('')
    lines.push('[ความเสี่ยง]')
    for (const r of risk.risks.slice(0, 3)) {
      lines.push(`- [${r.severity}] ${r.title}: ${r.detail}`)
    }
  }

  const forecast = getForecast({ startMonth: month, months: 6, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
  if (forecast.length > 0) {
    lines.push('')
    lines.push('[คาดการณ์ 6 เดือน]')
    for (const f of forecast) {
      lines.push(`- ${f.month}: รายรับ ${money(f.incomeTotal)} รายจ่าย ${money(f.expenseTotal + f.installmentTotal)} คงเหลือ ${money(f.netBalance)}`)
    }
  }

  const allTx: { name: string; amount: number; type: string }[] = []
  data.expenses.filter((e) => isExpenseActiveInMonth(e, month)).forEach((e) => allTx.push({ name: e.name, amount: e.amount, type: e.category }))
  data.installments.filter((i) => isInstallmentActiveInMonth(i, month)).forEach((i) => allTx.push({ name: i.name, amount: i.monthlyAmount, type: 'ผ่อน' }))
  allTx.sort((a, b) => b.amount - a.amount)
  const top = allTx.slice(0, 5)
  if (top.length > 0) {
    lines.push('')
    lines.push('[รายการหลักเดือนนี้]')
    for (const t of top) {
      lines.push(`- ${t.name} ${money(t.amount)} (${t.type})`)
    }
  }

  return lines.join('\n')
}
