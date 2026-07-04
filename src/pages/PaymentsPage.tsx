import { Check, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, FolderOpen, ReceiptText, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, EmptyState, PageTitle } from '../components/ui'
import { useData } from '../context/DataContext'
import { addMonths, getCurrentMonth } from '../lib/forecast'
import { money, monthLabel } from '../lib/format'
import { getPaidKeys, getPayablesForMonth, groupPayables, type PayableItem } from '../lib/payments'

type Filter = 'all' | 'unpaid' | 'paid'

export function PaymentsPage() {
  const data = useData()
  const [month, setMonth] = useState(getCurrentMonth())
  const [filter, setFilter] = useState<Filter>('unpaid')
  const [busyKey, setBusyKey] = useState('')
  const payables = useMemo(() => getPayablesForMonth({ month, ...data }), [month, data])
  const paidKeys = useMemo(() => getPaidKeys(data.paymentRecords, month), [data.paymentRecords, month])
  const paidItems = payables.filter((item) => paidKeys.has(item.key))
  const unpaidItems = payables.filter((item) => !paidKeys.has(item.key))
  const paidTotal = paidItems.reduce((sum, item) => sum + item.amount, 0)
  const unpaidTotal = unpaidItems.reduce((sum, item) => sum + item.amount, 0)
  const visibleItems = filter === 'paid' ? paidItems : filter === 'unpaid' ? unpaidItems : payables
  const groups = groupPayables(visibleItems)

  const toggle = async (item: (typeof payables)[number]) => {
    setBusyKey(item.key)
    try {
      await data.setPaymentStatus(item.itemType, item.itemId, month, !paidKeys.has(item.key))
    } finally {
      setBusyKey('')
    }
  }

  const toggleGroup = async (groupKey: string, items: PayableItem[]) => {
    const unpaid = items.filter((item) => !paidKeys.has(item.key))
    const markPaid = unpaid.length > 0
    const targets = markPaid ? unpaid : items
    setBusyKey(`group_${groupKey}`)
    try {
      await data.setPaymentStatuses(targets.map(({ itemType, itemId }) => ({ itemType, itemId })), month, markPaid)
    } finally {
      setBusyKey('')
    }
  }

  return <>
    <PageTitle
      title="รายการที่ต้องจ่าย"
      detail="เช็กว่าจ่ายอะไรแล้ว และยังเหลืออะไรในแต่ละเดือน"
      action={<div className="flex items-center gap-2"><button className="btn-secondary !px-3" onClick={() => setMonth(addMonths(month, -1))} aria-label="เดือนก่อน"><ChevronLeft size={18}/></button><input className="field w-[150px]" type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)}/><button className="btn-secondary !px-3" onClick={() => setMonth(addMonths(month, 1))} aria-label="เดือนถัดไป"><ChevronRight size={18}/></button></div>}
    />

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-800">{monthLabel(month)}</h2>
      {month !== getCurrentMonth() && <button className="text-sm font-semibold text-emerald-700 hover:underline" onClick={() => setMonth(getCurrentMonth())}>กลับมาเดือนนี้</button>}
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryCard label="ยอดที่ต้องจ่าย" value={paidTotal + unpaidTotal} detail={`${payables.length} รายการ`} icon={<ReceiptText/>} tint="bg-slate-100 text-slate-700"/>
      <SummaryCard label="จ่ายแล้ว" value={paidTotal} detail={`${paidItems.length} รายการ`} icon={<CheckCircle2/>} tint="bg-emerald-100 text-emerald-700"/>
      <SummaryCard label="ยังไม่ได้จ่าย" value={unpaidTotal} detail={`${unpaidItems.length} รายการ`} icon={<Clock3/>} tint="bg-amber-100 text-amber-700"/>
    </div>

    <Card className="mt-5 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterButton active={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>ยังไม่ได้จ่าย ({unpaidItems.length})</FilterButton>
        <FilterButton active={filter === 'paid'} onClick={() => setFilter('paid')}>จ่ายแล้ว ({paidItems.length})</FilterButton>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>ทั้งหมด ({payables.length})</FilterButton>
      </div>

      {visibleItems.length ? <div className="grid gap-5">{groups.map((group) => {
        const unpaidInGroup = group.items.filter((item) => !paidKeys.has(item.key))
        const markPaid = unpaidInGroup.length > 0
        return <section key={group.key} className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/60"><div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${group.kind === 'expense' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}><FolderOpen size={19}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-slate-900">{group.name}</h3><span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">{group.kind === 'expense' ? 'หมวดรายจ่าย' : 'บัตร / ช่องทางผ่อน'}</span></div><p className="mt-1 text-xs text-slate-400">{group.items.length} รายการ · รวม {money(group.total)}</p></div></div><button disabled={busyKey === `group_${group.key}`} onClick={() => toggleGroup(group.key, group.items)} className={markPaid ? 'btn-primary whitespace-nowrap !py-2' : 'btn-secondary whitespace-nowrap !py-2'}>{markPaid ? <><CheckCheck size={17}/>{unpaidInGroup.length === group.items.length ? 'จ่ายทั้งกลุ่ม' : `จ่ายที่เหลือ (${unpaidInGroup.length})`}</> : <><RotateCcw size={16}/>เปลี่ยนทั้งกลุ่มเป็นยังไม่จ่าย</>}</button></div><div className="grid gap-2 p-3 sm:p-4">{group.items.map((item) => {
        const isPaid = paidKeys.has(item.key)
        return <div key={item.key} className={`flex flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${isPaid ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-white'}`}>
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl ${isPaid ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{isPaid ? <Check size={20}/> : <Circle size={20}/>}</span>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={`font-semibold ${isPaid ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{item.name}</p><span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 shadow-sm">{item.itemType === 'expense' ? 'รายจ่าย' : 'ผ่อน'}</span></div><p className="mt-1 text-xs text-slate-400">{item.subtitle} · {item.dueDay ? `ครบกำหนดวันที่ ${item.dueDay}` : 'ไม่ได้ระบุวันครบกำหนด'}</p></div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end"><strong className={isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}>{money(item.amount)}</strong><button disabled={busyKey === item.key} onClick={() => toggle(item)} className={isPaid ? 'btn-secondary whitespace-nowrap !py-2' : 'btn-primary whitespace-nowrap !py-2'}>{isPaid ? <><RotateCcw size={16}/>เปลี่ยนเป็นยังไม่จ่าย</> : <><Check size={16}/>จ่ายแล้ว</>}</button></div>
        </div>
      })}</div></section>
      })}</div> : <EmptyState title={filter === 'paid' ? 'ยังไม่มีรายการที่จ่ายแล้ว' : filter === 'unpaid' && payables.length ? 'จ่ายครบแล้ว เยี่ยมเลย!' : 'ไม่มีรายการที่ต้องจ่ายในเดือนนี้'} detail={filter === 'paid' ? 'เมื่อกดจ่ายแล้ว รายการจะมาอยู่ตรงนี้' : 'เลือกเดือนถัดไปเพื่อดูรายการที่กำลังจะมาถึง'}/>} 
    </Card>
  </>
}

function SummaryCard({ label, value, detail, icon, tint }: { label: string; value: number; detail: string; icon: React.ReactNode; tint: string }) {
  return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{money(value)}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div><span className={`grid size-10 place-items-center rounded-2xl ${tint}`}>{icon}</span></div></Card>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${active ? 'bg-[#173f2b] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{children}</button>
}
