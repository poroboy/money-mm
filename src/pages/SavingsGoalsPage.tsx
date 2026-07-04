import { AlertTriangle, CalendarDays, CheckCircle2, CirclePause, Pencil, PiggyBank, Plus, Target, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, EmptyState, Field, Modal, PageTitle } from '../components/ui'
import { useData } from '../context/DataContext'
import { getCurrentMonth, getMonthlySummary, isValidMonth } from '../lib/forecast'
import { money, monthLabel } from '../lib/format'
import { getSavingsGoalPlan } from '../lib/goals'
import type { SavingsGoal, SavingsGoalPriority, SavingsGoalStatus } from '../lib/types'

const priorityLabels: Record<SavingsGoalPriority, string> = { high: 'สำคัญมาก', medium: 'ปานกลาง', low: 'ยืดหยุ่นได้' }
const statusLabels: Record<SavingsGoalStatus, string> = { active: 'กำลังเก็บ', paused: 'พักไว้', completed: 'สำเร็จแล้ว' }
const priorityStyles: Record<SavingsGoalPriority, string> = { high: 'bg-rose-50 text-rose-700', medium: 'bg-amber-50 text-amber-700', low: 'bg-slate-100 text-slate-600' }

export function SavingsGoalsPage() {
  const data = useData()
  const currentMonth = getCurrentMonth()
  const [editing, setEditing] = useState<SavingsGoal | null | undefined>(undefined)
  const goalsWithPlans = useMemo(() => data.savingsGoals
    .map((goal) => ({ goal, plan: getSavingsGoalPlan(goal, currentMonth) }))
    .sort((a, b) => Number(a.goal.status !== 'active') - Number(b.goal.status !== 'active') || (a.goal.targetMonth || '').localeCompare(b.goal.targetMonth || '')), [data.savingsGoals, currentMonth])
  const activePlans = goalsWithPlans.filter(({ goal }) => goal.status === 'active')
  const targetTotal = activePlans.reduce((sum, { plan }) => sum + plan.targetAmount, 0)
  const savedTotal = activePlans.reduce((sum, { plan }) => sum + plan.savedAmount, 0)
  const monthlyRequired = activePlans.reduce((sum, { plan }) => sum + plan.monthlyRequired, 0)
  const currentSummary = useMemo(() => getMonthlySummary({ month: currentMonth, ...data }), [currentMonth, data])
  const available = currentSummary.netBalance
  const remainingAfterGoals = available - monthlyRequired
  const affordable = monthlyRequired <= Math.max(0, available)
  const close = () => setEditing(undefined)
  const deleteGoal = async (goal: SavingsGoal) => { if (window.confirm(`ลบเป้าหมาย “${goal.name}” ใช่ไหม?`)) await data.remove('savingsGoals', goal.id) }

  return <>
    <PageTitle title="วางแผนเป้าหมายการเงิน" detail="ตั้งเป้าหมาย แล้วให้ระบบคำนวณว่าควรเก็บเดือนละเท่าไร" action={<button className="btn-primary" onClick={() => setEditing(null)}><Plus size={18}/>เพิ่มเป้าหมาย</button>}/>

    <Card className={`mb-5 overflow-hidden p-6 sm:p-8 ${affordable ? 'bg-[#173f2b] text-white' : 'bg-[#57251f] text-white'}`}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center"><div><div className="flex items-center gap-2 text-sm font-semibold text-[#dff574]">{affordable ? <TrendingUp size={18}/> : <AlertTriangle size={18}/>}แผนเก็บเงินเดือนนี้</div><p className="mt-3 text-3xl font-bold">ควรเก็บ {money(monthlyRequired)}</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">{!activePlans.length ? 'เพิ่มเป้าหมายแรก เช่น เที่ยวจีน ซื้อรถ หรือเงินสำรองฉุกเฉิน' : affordable ? `จากเงินคงเหลือเดือนนี้ ${money(available)} หลังเก็บตามแผนจะเหลือ ${money(remainingAfterGoals)}` : `แผนนี้เกินเงินคงเหลือเดือนนี้ ${money(Math.abs(remainingAfterGoals))} ลองเลื่อนกำหนดเป้าหมาย ลดงบ หรือพักเป้าหมายที่สำคัญน้อยกว่า`}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">เป้าหมายที่กำลังเก็บ</p><p className="mt-1 text-xl font-bold">{activePlans.length} เป้าหมาย</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">เงินคงเหลือเดือนนี้</p><p className="mt-1 text-xl font-bold">{money(available)}</p></div></div></div>
    </Card>

    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <Summary label="งบเป้าหมายรวม" value={targetTotal} icon={<Target/>} tint="bg-sky-100 text-sky-700"/>
      <Summary label="เก็บแล้ว" value={savedTotal} icon={<PiggyBank/>} tint="bg-emerald-100 text-emerald-700"/>
      <Summary label="ต้องเก็บต่อเดือน" value={monthlyRequired} icon={<CalendarDays/>} tint="bg-amber-100 text-amber-700"/>
    </div>

    {goalsWithPlans.length ? <div className="grid gap-4 lg:grid-cols-2">{goalsWithPlans.map(({ goal, plan }) => <Card key={goal.id} className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[goal.priority]}`}>{priorityLabels[goal.priority]}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">{statusLabels[goal.status]}</span>{plan.isOverdue && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">เลยกำหนด</span>}</div><h2 className="mt-3 truncate text-xl font-bold text-slate-900">{goal.name}</h2><p className="mt-1 text-sm text-slate-400">เป้าหมาย {isValidMonth(goal.targetMonth) ? monthLabel(goal.targetMonth) : 'ไม่ได้ระบุเดือน'}</p></div><div className="flex shrink-0 gap-1"><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setEditing(goal)} aria-label={`แก้ไข ${goal.name}`}><Pencil size={17}/></button><button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => deleteGoal(goal)} aria-label={`ลบ ${goal.name}`}><Trash2 size={17}/></button></div></div>
        <div className="mt-6"><div className="mb-2 flex justify-between text-xs"><span className="text-slate-400">เก็บแล้ว {money(plan.savedAmount)}</span><span className="font-semibold text-slate-600">{Math.round(plan.progress * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${Math.min(100, plan.progress * 100)}%` }}/></div></div>
        <div className="mt-5 grid grid-cols-3 gap-2"><GoalMetric label="ยังขาด" value={money(plan.remainingAmount)}/><GoalMetric label="เหลือเวลา" value={plan.monthsRemaining ? `${plan.monthsRemaining} เดือน` : 'ครบแล้ว'}/><GoalMetric label="เก็บ/เดือน" value={money(plan.monthlyRequired)}/></div>
        {goal.status === 'active' && plan.remainingAmount > 0 && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">แนะนำเก็บประมาณ <strong>{money(plan.weeklyRequired)}/สัปดาห์</strong> หรือ {money(plan.monthlyRequired)}/เดือน</p>}
        {goal.note && <p className="mt-4 text-sm leading-relaxed text-slate-500">{goal.note}</p>}
      </Card>)}</div> : <Card className="p-6"><EmptyState title="ยังไม่มีเป้าหมายการเงิน" detail="ลองเริ่มจาก “เที่ยวจีนปีหน้า” แล้วใส่งบประมาณที่ต้องการ"/></Card>}

    {editing !== undefined && <GoalModal value={editing} onClose={close} onSave={async (payload) => { await data.save('savingsGoals', payload, editing?.id); close() }}/>} 
  </>
}

function Summary({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint: string }) { return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(value)}</p></div><span className={`grid size-10 place-items-center rounded-2xl ${tint}`}>{icon}</span></div></Card> }
function GoalMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div> }

function GoalModal({ value, onClose, onSave }: { value: SavingsGoal | null; onClose: () => void; onSave: (value: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> }) {
  const defaultTarget = `${new Date().getFullYear() + 1}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [form, setForm] = useState({ name: value?.name ?? '', targetAmount: value?.targetAmount ?? 0, savedAmount: value?.savedAmount ?? 0, targetMonth: value?.targetMonth ?? defaultTarget, priority: value?.priority ?? 'medium' as SavingsGoalPriority, status: value?.status ?? 'active' as SavingsGoalStatus, note: value?.note ?? '' })
  const preview = getSavingsGoalPlan({ id: value?.id ?? 'preview', ...form }, getCurrentMonth())
  const submit = async (event: React.FormEvent) => { event.preventDefault(); await onSave({ ...form, targetAmount: Number(form.targetAmount), savedAmount: Number(form.savedAmount) }) }
  return <Modal title={value ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมายการเงิน'} onClose={onClose}><form className="grid gap-4" onSubmit={submit}><Field label="ชื่อเป้าหมาย"><input className="field" required value={form.name} onChange={(event) => setForm({...form,name:event.target.value})} placeholder="เช่น เที่ยวจีนปีหน้า"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="งบประมาณเป้าหมาย"><input className="field" required type="number" min="1" step="0.01" value={form.targetAmount || ''} onChange={(event) => setForm({...form,targetAmount:Number(event.target.value)})}/></Field><Field label="เก็บได้แล้ว"><input className="field" required type="number" min="0" step="0.01" value={form.savedAmount || ''} onChange={(event) => setForm({...form,savedAmount:Number(event.target.value)})}/></Field></div><Field label="ต้องการใช้เงินภายในเดือน"><input className="field" required type="month" value={form.targetMonth} onChange={(event) => setForm({...form,targetMonth:event.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="ความสำคัญ"><select className="field" value={form.priority} onChange={(event) => setForm({...form,priority:event.target.value as SavingsGoalPriority})}>{Object.entries(priorityLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="สถานะ"><select className="field" value={form.status} onChange={(event) => setForm({...form,status:event.target.value as SavingsGoalStatus})}>{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div><Field label="รายละเอียดเพิ่มเติม"><textarea className="field min-h-20" value={form.note} onChange={(event) => setForm({...form,note:event.target.value})} placeholder="เช่น ค่าตั๋ว ที่พัก และค่าใช้จ่ายระหว่างทริป"/></Field>{form.targetAmount > 0 && <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><div className="flex items-center gap-2 font-semibold">{form.status === 'paused' ? <CirclePause size={17}/> : preview.remainingAmount === 0 ? <CheckCircle2 size={17}/> : <PiggyBank size={17}/>}คำแนะนำเบื้องต้น</div><p className="mt-2 text-emerald-800">เหลือ {money(preview.remainingAmount)} · {preview.monthsRemaining || 0} เดือน · ควรเก็บ {money(preview.monthlyRequired)}/เดือน</p></div>}<div className="mt-2 flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={onClose}>ยกเลิก</button><button className="btn-primary" type="submit">บันทึกเป้าหมาย</button></div></form></Modal>
}
