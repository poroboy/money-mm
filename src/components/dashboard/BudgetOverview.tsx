import { useMemo } from 'react'
import { Card, EmptyState } from '../ui'
import { getCurrentMonth, getMonthlySummary, isExpenseActiveInMonth } from '../../lib/forecast'
import { money } from '../../lib/format'
import type { DataValue } from '../../context/DataContext'

const CATEGORY_BUDGET_PCT: Record<string, number> = {
  ที่อยู่อาศัย: 0.25, housing: 0.25,
  อาหาร: 0.15, food: 0.15, food_dining: 0.15, dining: 0.15,
  'เดินทาง': 0.10, transport: 0.10,
  'สาธารณูปโภค': 0.10, utility: 0.10,
  'ช้อปปิ้ง': 0.05, shopping: 0.05,
  'ความบันเทิง': 0.05, entertainment: 0.05,
  'สุขภาพ': 0.05, health: 0.05,
  'การศึกษา': 0.05, education: 0.05,
  อื่นๆ: 0.10, other: 0.10,
}

function BudgetBar({ label, current, suggested, percentage }: { label: string; current: number; suggested: number; percentage: number }) {
  const isOver = percentage >= 100
  const isNear = percentage >= 80 && !isOver
  const barColor = isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'

  return <div className="grid gap-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-slate-600'}`}>
        {money(current)} <span className="text-xs text-slate-400">/ {money(suggested)}</span>
      </span>
    </div>
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      {isOver && <div className="absolute right-0 top-0 h-full rounded-full bg-red-500/20" style={{ width: `${Math.min(percentage - 100, 100)}%`, left: '100%' }} />}
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className={`font-medium ${isOver ? 'text-red-600' : isNear ? 'text-amber-600' : 'text-slate-400'}`}>
        {percentage.toFixed(0)}%
      </span>
      {isOver && <span className="text-red-600">เกิน {money(current - suggested)}</span>}
      {isNear && !isOver && <span className="text-amber-600">ใกล้เกิน</span>}
    </div>
  </div>
}

export function BudgetOverview({ data }: { data: DataValue }) {
  const month = getCurrentMonth()

  const budgets = useMemo(() => {
    const summary = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const income = summary.incomeTotal
    const categoryTotals = new Map<string, number>()
    data.expenses.filter((e) => isExpenseActiveInMonth(e, month)).forEach((e) => {
      categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount)
    })
    return [...categoryTotals.entries()]
      .map(([category, current]) => {
        const pct = CATEGORY_BUDGET_PCT[category] ?? 0.10
        const suggested = Math.round(income * pct)
        const percentage = suggested > 0 ? (current / suggested) * 100 : current > 0 ? 100 : 0
        return { category, current, suggested, percentage }
      })
      .sort((a, b) => b.percentage - a.percentage)
  }, [data.expenses, data.incomes, data.accounts, data.installments, month])

  if (budgets.length === 0) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">ภาพรวมงบประมาณ</h3><EmptyState title="ยังไม่มีข้อมูลงบประมาณ" detail="เพิ่มรายจ่ายและตั้งงบประมาณเพื่อดูภาพรวม" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">ภาพรวมงบประมาณ</h3>
    <div className="grid gap-5">
      {budgets.map((b) => <BudgetBar key={b.category} label={b.category} current={b.current} suggested={b.suggested} percentage={b.percentage} />)}
    </div>
  </Card>
}
