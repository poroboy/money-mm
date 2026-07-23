import { Sparkles, X } from 'lucide-react'
import { useAIChat } from '../context/AIChatContext'
import { AIChatThread } from './AIChatThread'

export function AIChatWidget() {
  const { widgetOpen, setWidgetOpen } = useAIChat()

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
        <div className="mb-2 flex items-center gap-2 px-1">
          <Sparkles size={18} className="text-[#173f2b]" />
          <p className="font-bold text-slate-900">ผู้ช่วยการเงิน</p>
        </div>
        <AIChatThread compact />
      </div>
    )}
  </>
}

