import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react'
import { Card, EmptyState } from '../ui'
import { getCurrentMonth, getMonthlySummary, addMonths, getForecast } from '../../lib/forecast'
import { money } from '../../lib/format'
import type { DataValue } from '../../context/DataContext'
import { getFinancialHealthScore, getBudgetCoaching } from '../../lib/ai/snapshot'

type Insight = { icon: typeof ArrowUpRight; iconBg: string; iconColor: string; title: string; detail: string; aiPrompt?: string }

function InsightCard({ insight, onAnalyze }: { insight: Insight; onAnalyze?: (prompt: string) => void }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${insight.iconBg}`}><insight.icon size={18} className={insight.iconColor} /></span>
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{insight.title}</p><p className="mt-0.5 text-xs leading-relaxed text-slate-500">{insight.detail}</p>
      {insight.aiPrompt && onAnalyze && <button onClick={() => onAnalyze(insight.aiPrompt!)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"><Sparkles size={12} />วิเคราะห์ด้วย AI</button>}
    </div>
  </div>
}

export function FinancialInsights({ data, onAnalyze }: { data: DataValue; onAnalyze?: (prompt: string) => void }) {
  const month = getCurrentMonth()
  const prevMonth = addMonths(month, -1)

  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = []
    const current = getMonthlySummary({ month, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const prev = getMonthlySummary({ month: prevMonth, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const totalExpense = current.expenseTotal + current.installmentTotal
    const prevTotalExpense = prev.expenseTotal + prev.installmentTotal

    if (current.incomeTotal === 0 && totalExpense === 0) return result

    const snapshotInput = { incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments, paymentRecords: data.paymentRecords, savingsGoals: data.savingsGoals }

    if (prevTotalExpense > 0) {
      const change = ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100
      if (Math.abs(change) >= 5) {
        const isUp = change > 0
        result.push({
          icon: isUp ? ArrowUpRight : ArrowDownRight,
          iconBg: isUp ? 'bg-red-100' : 'bg-emerald-100',
          iconColor: isUp ? 'text-red-600' : 'text-emerald-600',
          title: `รายจ่าย${isUp ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(change).toFixed(0)}%`,
          detail: `เทียบกับเดือนที่แล้ว ${isUp ? 'เพิ่มขึ้น' : 'ลดลง'} ${money(Math.abs(totalExpense - prevTotalExpense))}`,
          aiPrompt: `วิเคราะห์การเปลี่ยนแปลงของรายจ่ายเดือนนี้ที่${isUp ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(change).toFixed(0)}% เมื่อเทียบกับเดือนที่แล้วให้ละเอียดหน่อย`,
        })
      }
    }

    if (current.incomeTotal > 0) {
      const savingsRate = Math.max(0, current.netBalance) / current.incomeTotal
      const prevSavingsRate = prev.incomeTotal > 0 ? Math.max(0, prev.netBalance) / prev.incomeTotal : 0
      if (prev.incomeTotal > 0) {
        const diff = (savingsRate - prevSavingsRate) * 100
        if (Math.abs(diff) >= 3) {
          const isUp = diff > 0
          result.push({
            icon: isUp ? ArrowUpRight : ArrowDownRight,
            iconBg: isUp ? 'bg-emerald-100' : 'bg-red-100',
            iconColor: isUp ? 'text-emerald-600' : 'text-red-600',
            title: `อัตราการออม${isUp ? 'ดีขึ้น' : 'ลดลง'}`,
            detail: `จาก ${(prevSavingsRate * 100).toFixed(0)}% เป็น ${(savingsRate * 100).toFixed(0)}% ของรายรับ`,
            aiPrompt: `วิเคราะห์อัตราการออมที่${isUp ? 'ดีขึ้น' : 'ลดลง'} จาก ${(prevSavingsRate * 100).toFixed(0)}% เป็น ${(savingsRate * 100).toFixed(0)}% และแนะนำวิธี${isUp ? 'รักษาระดับนี้' : 'ปรับปรุง'}`,
          })
        }
      }
    }

    const budgetCoaching = getBudgetCoaching(snapshotInput)
    const overBudgetItems = budgetCoaching.overspendCategories
    if (overBudgetItems.length > 0) {
      const top = overBudgetItems[0]
      result.push({
        icon: ArrowUpRight,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        title: `${top.category} เกินงบ ${top.percentageOver}%`,
        detail: `ใช้ไป ${money(top.currentSpending)} จากงบ ${money(top.suggestedBudget)} เกิน ${money(top.overspendAmount)}`,
        aiPrompt: `หมวด${top.category}ใช้เงินเกินงบ ${top.percentageOver}% มีวิธีลดรายจ่ายส่วนนี้ยังไงบ้าง?`,
      })
    }

    const healthScore = getFinancialHealthScore(snapshotInput)
    const lowComponents = healthScore.components.filter((c) => c.status === 'poor' || c.status === 'fair').slice(0, 2)
    for (const comp of lowComponents) {
      result.push({
        icon: ArrowDownRight,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: comp.name,
        detail: comp.detail,
        aiPrompt: `ช่วยวิเคราะห์${comp.name}ให้ละเอียดและแนะนำวิธีปรับปรุง`,
      })
    }

    const forecast = getForecast({ startMonth: month, months: 6, incomes: data.incomes, expenses: data.expenses, accounts: data.accounts, installments: data.installments })
    const riskMonths = forecast.filter((m) => m.netBalance < 0)
    if (riskMonths.length > 0) {
      result.push({
        icon: ArrowDownRight,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: `ความเสี่ยงเงินติดลบใน ${riskMonths.length} เดือนข้างหน้า`,
        detail: `เดือน ${riskMonths[0].month} คาดว่าจะติดลบ ${money(Math.abs(riskMonths[0].netBalance))}`,
        aiPrompt: `เดือน ${riskMonths[0].month} คาดว่าเงินจะติดลบ ${money(Math.abs(riskMonths[0].netBalance))} มีวิธีป้องกันยังไงบ้าง?`,
      })
    }

    return result.slice(0, 5)
  }, [data, month, prevMonth])

  if (insights.length === 0) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">ข้อมูลเชิงลึก</h3><EmptyState title="ยังไม่มีข้อมูลเพียงพอ" detail="เพิ่มข้อมูลทางการเงินเพื่อดูข้อมูลเชิงลึกอัตโนมัติ" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">ข้อมูลเชิงลึก</h3>
    <div className="grid gap-3">{insights.map((insight, i) => <InsightCard key={i} insight={insight} onAnalyze={onAnalyze} />)}</div>
  </Card>
}
