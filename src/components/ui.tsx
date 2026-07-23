import { TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 sm:place-items-center sm:p-4" onMouseDown={onClose}>
    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7" onMouseDown={(event) => event.stopPropagation()}>
      <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">{title}</h2><button className="rounded-full p-2 hover:bg-slate-100" onClick={onClose} aria-label="ปิด"><X size={20}/></button></div>
      {children}
    </div>
  </div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center"><p className="font-semibold text-slate-700">{title}</p><p className="mt-1 text-sm text-slate-400">{detail}</p></div>
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, destructive, onConfirm, onCancel }: {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/35 p-0 sm:place-items-center sm:p-4" onMouseDown={onCancel}>
    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-sm sm:rounded-3xl sm:p-6" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start gap-4">
        <div className={`grid size-10 shrink-0 place-items-center rounded-full ${destructive ? 'bg-red-100' : 'bg-slate-100'}`}>
          <TriangleAlert size={20} className={destructive ? 'text-red-600' : 'text-slate-600'} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300">{cancelLabel || 'ยกเลิก'}</button>
        <button onClick={onConfirm} className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 ${destructive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-[#173f2b] hover:bg-[#22563c] focus:ring-emerald-400'}`}>{confirmLabel || 'ยืนยัน'}</button>
      </div>
    </div>
  </div>
}

export function PageTitle({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-slate-500">{detail}</p></div>{action}</div>
}
