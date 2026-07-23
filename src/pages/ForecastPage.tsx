import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, PageTitle } from '../components/ui'
import { useData } from '../context/DataContext'
import { getCurrentMonth, getForecast } from '../lib/forecast'
import { money, monthLabel } from '../lib/format'

export function ForecastPage() {
  const data = useData()
  const [startMonth, setStartMonth] = useState(getCurrentMonth())
  const rows = useMemo(() => getForecast({ startMonth, months: data.settings.forecastMonths, ...data }), [startMonth, data])
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    incomeTotal: sum.incomeTotal + row.incomeTotal,
    expenseTotal: sum.expenseTotal + row.expenseTotal,
    installmentTotal: sum.installmentTotal + row.installmentTotal,
    netBalance: sum.netBalance + row.netBalance,
  }), { incomeTotal: 0, expenseTotal: 0, installmentTotal: 0, netBalance: 0 }), [rows])
  return <><PageTitle title="คาดการณ์การเงิน" detail={`มองล่วงหน้า ${data.settings.forecastMonths} เดือนจากกฎรายรับ รายจ่าย และยอดผ่อน`} action={<input className="field w-auto" type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)}/>} />
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><ForecastTotal label="รายรับรวม" value={totals.incomeTotal} color="text-emerald-700"/><ForecastTotal label="รายจ่ายรวม" value={totals.expenseTotal} color="text-rose-700"/><ForecastTotal label="ยอดผ่อนรวม" value={totals.installmentTotal} color="text-amber-700"/><ForecastTotal label="เงินคงเหลือรวม" value={totals.netBalance} color={totals.netBalance < 0 ? 'text-red-700' : 'text-sky-700'}/></div>
    <Card className="mb-5 p-4 sm:p-7"><h2 className="mb-5 font-bold text-slate-900">ภาพรวมรายเดือน</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ left: -12, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece8"/><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => `${Math.round(value / 1000)}k`}/><Tooltip formatter={(value) => money(Number(value))}/><Legend/><Bar dataKey="incomeTotal" name="รายรับ" fill="#2c7a51" radius={[5,5,0,0]}/><Bar dataKey="expenseTotal" name="รายจ่าย" fill="#e8897e" radius={[5,5,0,0]}/><Bar dataKey="installmentTotal" name="ยอดผ่อน" fill="#e9b949" radius={[5,5,0,0]}/><Line type="monotone" dataKey="netBalance" name="เงินคงเหลือ" stroke="#2782b8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }}/></ComposedChart></ResponsiveContainer></div></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-slate-400"><tr>{['เดือน','รายรับ','รายจ่าย','ยอดผ่อน','เงินคงเหลือ'].map((label) => <th key={label} className="px-5 py-4 font-medium">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.month} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{monthLabel(row.month)}</td><td className="px-5 py-4 text-emerald-700">{money(row.incomeTotal)}</td><td className="px-5 py-4">{money(row.expenseTotal)}</td><td className="px-5 py-4">{money(row.installmentTotal)}</td><td className={`px-5 py-4 font-bold ${row.netBalance < 0 ? 'text-red-600' : 'text-slate-900'}`}>{money(row.netBalance)}</td></tr>)}</tbody></table></div></Card>
  </>
}

function ForecastTotal({ label, value, color }: { label: string; value: number; color: string }) {
  return <Card className="p-5"><p className="text-sm text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{money(value)}</p></Card>
}
