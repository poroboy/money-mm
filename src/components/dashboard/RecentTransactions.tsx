import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CreditCard, ReceiptText } from 'lucide-react'
import { Card, EmptyState } from '../ui'
import { getCurrentMonth, isExpenseActiveInMonth, isInstallmentActiveInMonth } from '../../lib/forecast'
import { money } from '../../lib/format'
import type { DataValue } from '../../context/DataContext'

function TxIcon({ type, category }: { type: 'expense' | 'installment'; category?: string }) {
  const colorMap: Record<string, string> = {
    อาหาร: 'bg-orange-100 text-orange-600', food: 'bg-orange-100 text-orange-600', food_dining: 'bg-orange-100 text-orange-600',
    'เดินทาง': 'bg-blue-100 text-blue-600', transport: 'bg-blue-100 text-blue-600',
    ช้อปปิ้ง: 'bg-pink-100 text-pink-600', shopping: 'bg-pink-100 text-pink-600',
    ที่อยู่อาศัย: 'bg-violet-100 text-violet-600', housing: 'bg-violet-100 text-violet-600',
    'ความบันเทิง': 'bg-purple-100 text-purple-600', entertainment: 'bg-purple-100 text-purple-600',
    'สาธารณูปโภค': 'bg-cyan-100 text-cyan-600', utility: 'bg-cyan-100 text-cyan-600',
    สุขภาพ: 'bg-green-100 text-green-600', health: 'bg-green-100 text-green-600',
    การศึกษา: 'bg-indigo-100 text-indigo-600', education: 'bg-indigo-100 text-indigo-600',
  }
  if (type === 'installment') return <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600"><CreditCard size={16} /></span>
  const color = category ? colorMap[category] ?? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'
  return <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${color}`}><ReceiptText size={16} /></span>
}

type TxItem = { id: string; name: string; amount: number; date: string; route: string; type: 'expense' | 'installment'; category?: string }

export function RecentTransactions({ data }: { data: DataValue }) {
  const navigate = useNavigate()
  const month = getCurrentMonth()

  const items = useMemo<TxItem[]>(() => {
    const result: TxItem[] = []
    data.expenses.filter((e) => isExpenseActiveInMonth(e, month)).slice(0, 10).forEach((e) => {
      result.push({ id: e.id, name: e.name, amount: e.amount, date: e.payDay ? `วันที่ ${e.payDay}` : '—', route: '/expenses', type: 'expense', category: e.category })
    })
    data.installments.filter((i) => isInstallmentActiveInMonth(i, month)).slice(0, 10).forEach((i) => {
      result.push({ id: i.id, name: i.name, amount: i.monthlyAmount, date: i.paymentDay ? `วันที่ ${i.paymentDay}` : '—', route: '/installments', type: 'installment' })
    })
    return result.sort((a, b) => {
      const aDay = parseInt(a.date.replace('วันที่ ', '')) || 31
      const bDay = parseInt(b.date.replace('วันที่ ', '')) || 31
      return aDay - bDay
    }).slice(0, 10)
  }, [data.expenses, data.installments, month])

  if (items.length === 0) return <Card className="p-7"><h3 className="mb-5 font-bold text-slate-900">รายการล่าสุด</h3><EmptyState title="ยังไม่มีรายการ" detail="เพิ่มรายจ่ายหรือรายการผ่อนเพื่อดูรายการล่าสุด" /></Card>

  return <Card className="p-5 sm:p-7">
    <h3 className="mb-5 font-bold text-slate-900">รายการล่าสุด</h3>
    <div className="grid gap-2">
      {items.map((item) => <button key={`${item.type}_${item.id}`} onClick={() => navigate(item.route)} className="flex items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300">
        <TxIcon type={item.type} category={item.category} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{item.type === 'installment' ? 'ผ่อนชำระ' : item.category} · {item.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-semibold text-slate-900">{money(item.amount)}</span>
          <ArrowRight size={14} className="shrink-0 text-slate-300" />
        </div>
      </button>)}
    </div>
  </Card>
}
