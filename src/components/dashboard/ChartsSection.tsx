import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, EmptyState } from '../ui'
import { getCurrentMonth, getForecast, getMonthlySummary, addMonths } from '../../lib/forecast'
import { money, monthLabel } from '../../lib/format'
import type { DataValue } from '../../context/DataContext'

const CHART_COLORS = ['#173f2b', '#2c7a51', '#5cb882', '#94d3b5', '#dff574', '#f5a623', '#e8564a', '#7c3aed', '#06b6d4', '#f97316', '#84cc16', '#a1a1aa']

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg"><p className="font-medium text-slate-900">{label}</p>{payload.map((p, i) => <p key={i} className="text-slate-600">{money(p.value ?? 0)}</p>)}</div>
}

function IncomeVsExpenseChart({ data }: { data: DataValue }) {
  const month = getCurrentMonth()
  const chartData = useMemo(() => {
    const start = addMonths(month, -5)
    return getForecast({ startMonth: start, months: 6, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
      .map((s) => ({ name: monthLabel(s.month).slice(0, 3), รายรับ: s.incomeTotal, รายจ่าย: s.expenseTotal + s.installmentTotal }))
  }, [data.incomes, data.expenses, data.accounts, data.installments, month])

  const hasData = chartData.some((d) => d.รายรับ > 0 || d.รายจ่าย > 0)
  if (!hasData) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">รายรับ vs รายจ่าย (6 เดือน)</h3><EmptyState title="ยังไม่มีข้อมูลแผนภูมิ" detail="เพิ่มรายรับและรายจ่ายเพื่อดูเปรียบเทียบรายเดือน" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">รายรับ vs รายจ่าย (6 เดือน)</h3>
    <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} barGap={4}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece8" />
      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
      <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
      <Tooltip content={<ChartTooltip />} />
      <Bar dataKey="รายรับ" fill="#2c7a51" radius={[6, 6, 0, 0]} maxBarSize={36} />
      <Bar dataKey="รายจ่าย" fill="#e8564a" radius={[6, 6, 0, 0]} maxBarSize={36} />
    </BarChart></ResponsiveContainer></div>
  </Card>
}

function CategoryExpenseChart({ data }: { data: DataValue }) {
  const month = getCurrentMonth()
  const chartData = useMemo(() => {
    const summary = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    if (summary.incomeTotal === 0 && summary.expenseTotal === 0) return []
    const categoryTotals = new Map<string, number>()
    data.expenses.filter((e) => e.isActive).forEach((e) => {
      const isActive = month >= e.startMonth && (e.type === 'forever' || (e.type === 'fixed_months' && !e.repeatMonths) || month < addMonths(e.startMonth, e.repeatMonths ?? 0))
      if (isActive) categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + e.amount)
    })
    return [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [data.expenses, data.incomes, data.accounts, data.installments, month])

  if (chartData.length === 0) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">รายจ่ายแยกตามหมวด</h3><EmptyState title="ยังไม่มีข้อมูลแผนภูมิ" detail="เพิ่มรายจ่ายเพื่อดูสัดส่วนรายจ่ายแต่ละหมวด" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">รายจ่ายแยกตามหมวด</h3>
    <div className="flex h-64 items-center"><ResponsiveContainer width="100%" height="100%"><PieChart>
      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
        {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(value) => money(Number(value) ?? 0)} />
      <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-slate-500">{value}</span>} />
    </PieChart></ResponsiveContainer></div>
  </Card>
}

function DailySpendingChart({ data }: { data: DataValue }) {
  const month = getCurrentMonth()
  const chartData = useMemo(() => {
    const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    const daily = new Array(daysInMonth).fill(0)
    data.paymentRecords.filter((r) => r.month === month && r.isPaid && r.paidAt).forEach((r) => {
      const paidDate = (r.paidAt as { toDate?: () => Date } | null)?.toDate ? (r.paidAt as { toDate: () => Date }).toDate() : new Date((r.paidAt as { seconds: number }).seconds * 1000)
      if (paidDate.getMonth() + 1 === Number(month.slice(5, 7)) && paidDate.getFullYear() === Number(month.slice(0, 4))) {
        const day = paidDate.getDate() - 1
        const expense = data.expenses.find((e) => e.id === r.itemId && r.itemType === 'expense')
        const installment = data.installments.find((i) => i.id === r.itemId && r.itemType === 'installment')
        daily[day] += expense ? expense.amount : installment ? installment.monthlyAmount : 0
      }
    })
    return daily.map((value, i) => ({ day: i + 1, value }))
  }, [data.paymentRecords, data.expenses, data.installments, month])

  const hasData = chartData.some((d) => d.value > 0)
  if (!hasData) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">รายจ่ายรายวัน</h3><EmptyState title="ยังไม่มีข้อมูลรายวัน" detail="บันทึกสถานะการจ่ายเงินเพื่อดูรายจ่ายรายวัน หรือเพิ่มรายการที่มีวันที่จ่าย" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">รายจ่ายรายวัน</h3>
    <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece8" />
      <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} interval={3} />
      <YAxis tickLine={false} axisLine={false} fontSize={10} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
      <Tooltip content={<ChartTooltip />} />
      <Bar dataKey="value" fill="#2c7a51" radius={[4, 4, 0, 0]} maxBarSize={20} />
    </BarChart></ResponsiveContainer></div>
  </Card>
}

export function ChartsSection({ data }: { data: DataValue }) {
  return <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
    <IncomeVsExpenseChart data={data} />
    <CategoryExpenseChart data={data} />
    <div className="xl:col-span-2"><DailySpendingChart data={data} /></div>
  </div>
}
