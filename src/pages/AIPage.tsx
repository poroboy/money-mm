import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Card, ConfirmDialog, PageTitle } from '../components/ui'
import { useAIChat } from '../context/AIChatContext'
import { AIChatThread } from '../components/AIChatThread'

export function AIPage() {
  const { sending, clearConversation } = useAIChat()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  return <div className="mx-auto max-w-[1100px] max-lg:max-w-full">
    <PageTitle
      title="ผู้ช่วย AI"
      detail="ถามสถานะการเงิน ขอคำแนะนำ หรือให้ช่วยบันทึกรายการได้จากตรงนี้"
      action={<button
        onClick={() => setShowClearConfirm(true)}
        disabled={sending}
        aria-label="ลบประวัติแชท"
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-40"
      ><Trash2 size={16} />ลบประวัติแชท</button>}
    />
    <Card className="mt-8 h-[calc(100vh-260px)] min-h-[480px]">
      <AIChatThread />
    </Card>
    {showClearConfirm && <ConfirmDialog
      title="ลบประวัติแชท?"
      message="การดำเนินการนี้จะลบประวัติการสนทนาปัจจุบันอย่างถาวร ข้อมูลทางการเงิน รายรับ รายจ่าย เป้าหมาย งบประมาณ หมวดหมู่ และข้อมูล Firestore จะไม่ถูกลบ"
      confirmLabel="ลบประวัติแชท"
      cancelLabel="ยกเลิก"
      destructive
      onConfirm={() => { clearConversation(); setShowClearConfirm(false) }}
      onCancel={() => setShowClearConfirm(false)}
    />}
  </div>
}

