import { ArrowDownRight, ArrowUpRight, Landmark, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, EmptyState, PageTitle } from '../components/ui'
import { useData } from '../context/DataContext'
import { getFinancialHealth, getForecast, getMonthlySummary, getCurrentMonth } from '../lib/forecast'
import { money, monthLabel } from '../lib/format'

const healthStyles = { good: 'bg-emerald-50 text-emerald-700', ok: 'bg-blue-50 text-blue-700', warning: 'bg-amber-50 text-amber-700', danger: 'bg-red-50 text-red-700' }

export function DashboardPage() {
  const data = useData()
  const [month, setMonth] = useState(getCurrentMonth())
  const summary = useMemo(() => getMonthlySummary({ month, ...data }), [month, data])
  const forecast = useMemo(() => getForecast({ startMonth: month, months: 12, ...data }), [month, data])
  const health = getFinancialHealth(summary)
  const noData = !data.incomes.length && !data.expenses.length && !data.installments.length
  if (data.loading) return <p className="text-sm text-slate-500">กำลังโหลดข้อมูลจาก Cloud…</p>
  return <>
    <PageTitle title="ภาพรวมการเงิน" detail="เช็กสถานะเดือนนี้ และมองเงินล่วงหน้า 12 เดือน" action={<input className="field w-auto" type="month" value={month} onChange={(event) => setMonth(event.target.value)}/>} />
    {data.error && <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">เชื่อมต่อ Firestore ไม่สำเร็จ: {data.error}</p>}
    {noData && <div className="mb-6"><EmptyState title="เริ่มต้นด้วยการเพิ่มรายรับ เช่น เงินเดือน" detail="จากนั้นเพิ่มรายจ่ายประจำและรายการผ่อน เพื่อดู forecast ที่แม่นยำ"/></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="รายรับ" value={summary.incomeTotal} icon={<ArrowUpRight/>} tint="bg-emerald-100 text-emerald-700"/>
      <Metric label="รายจ่าย" value={summary.expenseTotal} icon={<ArrowDownRight/>} tint="bg-rose-100 text-rose-700"/>
      <Metric label="ยอดผ่อน" value={summary.installmentTotal} icon={<WalletCards/>} tint="bg-amber-100 text-amber-700"/>
      <Metric label="เงินคงเหลือ" value={summary.netBalance} icon={<Landmark/>} tint="bg-sky-100 text-sky-700"/>
    </div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      <Card className="p-5 sm:p-7"><div className="mb-5"><h2 className="font-bold text-slate-900">เงินคงเหลือ 12 เดือน</h2><p className="text-sm text-slate-400">เริ่มจาก {monthLabel(month)}</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecast}><defs><linearGradient id="balance" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2c7a51" stopOpacity={0.35}/><stop offset="100%" stopColor="#2c7a51" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece8"/><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/><Tooltip formatter={(value) => money(Number(value))}/><Area type="monotone" dataKey="netBalance" stroke="#246b47" strokeWidth={3} fill="url(#balance)"/></AreaChart></ResponsiveContainer></div></Card>
      <div className="grid gap-5"><Card className="p-6"><div className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${healthStyles[health.status]}`}>{health.label}</div><h2 className="mt-4 text-xl font-bold text-slate-900">สุขภาพการเงินเดือนนี้</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">{health.message}</p><div className="mt-5 grid grid-cols-2 gap-3"><Ratio label="ภาระต่อรายรับ" value={health.burdenRatio}/><Ratio label="เงินเหลือต่อรายรับ" value={health.savingRatio}/></div></Card><Card className="p-6"><h2 className="font-bold text-slate-900">ยอดผ่อนแยกตามช่องทาง</h2><div className="mt-4 grid gap-3">{summary.accountSummaries.length ? summary.accountSummaries.map((item) => <div className="flex items-center justify-between" key={item.accountId}><span className="text-sm text-slate-500">{item.accountName}</span><strong className="text-sm text-slate-900">{money(item.total)}</strong></div>) : <p className="text-sm text-slate-400">ไม่มีรายการผ่อนในเดือนนี้</p>}</div></Card></div>
    </div>
  </>
}

function Metric({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) { return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className={`mt-3 text-2xl font-bold ${value < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(value)}</p></div><span className={`grid size-10 place-items-center rounded-2xl ${tint}`}>{icon}</span></div></Card> }
function Ratio({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-800">{Math.round(value * 100)}%</p></div> }
