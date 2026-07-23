import { ArrowDownRight, ArrowUpRight, Landmark, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Card } from '../ui'
import { addMonths, getMonthlySummary, getCurrentMonth } from '../../lib/forecast'
import { money } from '../../lib/format'
import type { DataValue } from '../../context/DataContext'

function ChangeBadge({ value }: { value: number }) {
  if (value === 0) return null
  const isPositive = value > 0
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
    {Math.abs(value).toFixed(0)}%
  </span>
}

export function SummaryCards({ data }: { data: DataValue }) {
  const month = getCurrentMonth()
  const prevMonth = addMonths(month, -1)

  const { current, prev } = useMemo(() => {
    const current = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const prev = getMonthlySummary({ month: prevMonth, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    return { current, prev }
  }, [data.incomes, data.expenses, data.accounts, data.installments, month, prevMonth])

  const calcChange = (current: number, prev: number) => prev > 0 ? ((current - prev) / prev) * 100 : current > 0 ? 100 : 0

  const savings = Math.max(0, current.netBalance)
  const prevSavings = Math.max(0, prev.netBalance)
  const items = [
    { label: 'เงินคงเหลือ', value: current.netBalance, change: calcChange(current.netBalance, prev.netBalance), icon: Landmark, tint: 'bg-blue-100 text-blue-700' },
    { label: 'รายรับทั้งหมด', value: current.incomeTotal, change: calcChange(current.incomeTotal, prev.incomeTotal), icon: ArrowUpRight, tint: 'bg-emerald-100 text-emerald-700' },
    { label: 'รายจ่ายทั้งหมด', value: current.expenseTotal + current.installmentTotal, change: calcChange(current.expenseTotal + current.installmentTotal, prev.expenseTotal + prev.installmentTotal), icon: ArrowDownRight, tint: 'bg-rose-100 text-rose-700' },
    { label: 'เงินออม', value: savings, change: calcChange(savings, prevSavings), icon: PiggyBank, tint: 'bg-amber-100 text-amber-700' },
  ]

  const noData = !data.incomes.length && !data.expenses.length && !data.installments.length

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => <Card key={item.label} className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{item.label}</p>
          <p className={`mt-2 truncate text-2xl font-bold ${item.value < 0 ? 'text-red-600' : 'text-slate-900'}`}>{noData ? '—' : money(item.value)}</p>
          {!noData && <div className="mt-1.5 flex items-center gap-1.5"><ChangeBadge value={item.change} /></div>}
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${item.tint}`}><item.icon size={20} /></span>
      </div>
    </Card>)}
  </div>
}
