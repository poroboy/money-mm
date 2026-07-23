import { Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useAIChat } from '../context/AIChatContext'
import { AIChatThread } from './AIChatThread'
import { ConfirmDialog } from './ui'

export function AIChatWidget() {
  const { widgetOpen, setWidgetOpen, sending, clearConversation } = useAIChat()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  return <>
    <button
      onClick={() => setWidgetOpen(!widgetOpen)}
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#173f2b] text-white shadow-xl transition hover:scale-105"
      aria-label="เปิดผู้ช่วย AI"
    >
      {widgetOpen ? <X size={22} /> : <Sparkles size={22} />}
    </button>
    {widgetOpen && (
      <div className="fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col rounded-3xl bg-white p-4 shadow-2xl ring-1 ring-black/5">
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#173f2b]" />
            <p className="font-bold text-slate-900">ผู้ช่วยการเงิน</p>
          </div>
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={sending}
            aria-label="ลบประวัติแชท"
            className="grid size-8 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-30"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <AIChatThread compact />
      </div>
    )}
    {showClearConfirm && <ConfirmDialog
      title="ลบประวัติแชท?"
      message="การดำเนินการนี้จะลบประวัติการสนทนาปัจจุบันอย่างถาวร ข้อมูลทางการเงิน รายรับ รายจ่าย เป้าหมาย งบประมาณ หมวดหมู่ และข้อมูล Firestore จะไม่ถูกลบ"
      confirmLabel="ลบประวัติแชท"
      cancelLabel="ยกเลิก"
      destructive
      onConfirm={() => { clearConversation(); setShowClearConfirm(false) }}
      onCancel={() => setShowClearConfirm(false)}
    />}
  </>
}

