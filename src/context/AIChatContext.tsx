import { collection, doc, getDocs, orderBy, query, limit, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sendChatMessage, textOf, type ChatMessage, type PendingAction } from '../lib/ai/client'
import { buildFinancialContext } from '../lib/ai/context'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'

type AIChatValue = {
  messages: ChatMessage[]
  sending: boolean
  error: string
  send: (text: string, externalContext?: string) => Promise<void>
  retry: () => void
  clearConversation: () => void
  loadingThread: boolean
  widgetOpen: boolean
  setWidgetOpen: (value: boolean) => void
  pendingAction: PendingAction
  confirm: () => Promise<void>
  cancel: () => void
}

const AIChatContext = createContext<AIChatValue | null>(null)

function mapError(error: unknown): string {
  const message = (error as Error)?.message || ''
  if (message.includes('VITE_AI_PROXY_URL')) return 'การตั้งค่า AI ยังไม่สมบูรณ์'
  if (message.includes('429') || message.includes('Too Many Requests') || message.includes('rate limit')) return 'ระบบ AI กำลังมีผู้ใช้หนาแน่น กรุณาลองใหม่ในอีกสักครู่'
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Network request failed') || message.includes('fetch') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED')) return 'ไม่สามารถเชื่อมต่อกับระบบ AI ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
  if (message.includes('401') || message.includes('Unauthorized') || message.includes('403') || message.includes('Forbidden')) return 'การยืนยันตัวตนกับระบบ AI ล้มเหลว กรุณาตรวจสอบการตั้งค่า'
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('Internal Server Error') || message.includes('Bad Gateway') || message.includes('Service Unavailable')) return 'เซิร์ฟเวอร์ AI มีปัญหา กรุณาลองใหม่ในภายหลัง'
  if (message.includes('408') || message.includes('504') || message.includes('Timeout') || message.includes('timeout') || message.includes('AbortError')) return 'ระบบ AI ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง'
  if (message.includes('400') || message.includes('Bad Request')) return 'คำขอไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
  if (message.includes('413') || message.includes('Payload Too Large')) return 'ข้อความยาวเกินไป กรุณาตัดข้อความให้สั้นลง'
  if (message.includes('Both models failed')) return 'ระบบ AI ไม่พร้อมให้บริการ กรุณาลองใหม่ในภายหลัง'
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

export function AIChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const data = useData()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [loadingThread, setLoadingThread] = useState(true)
  const [lastUserText, setLastUserText] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const threadIdRef = useRef<string | null>(null)
  const initialLoadDone = useRef(false)

  useEffect(() => {
    if (!user) {
      setLoadingThread(false)
      return
    }
    if (initialLoadDone.current) {
      setLoadingThread(false)
      return
    }
    const load = async () => {
      try {
        const threadSnapshot = await getDocs(
          query(collection(db, 'users', user.uid, 'chatThreads'), orderBy('updatedAt', 'desc'), limit(1)),
        )
        initialLoadDone.current = true
        if (!threadSnapshot.empty) {
          const threadDoc = threadSnapshot.docs[0]
          const threadData = threadDoc.data()
          threadIdRef.current = threadDoc.id
          if (threadData.messages) setMessages(threadData.messages as ChatMessage[])
        }
      } catch {
        initialLoadDone.current = true
      } finally {
        setLoadingThread(false)
      }
    }
    load()
  }, [user])

  const persist = useCallback(async (next: ChatMessage[], userText: string) => {
    if (!user) return
    let tid = threadIdRef.current
    const isNew = !tid
    if (isNew) {
      tid = doc(collection(db, 'users', user.uid, 'chatThreads')).id
      threadIdRef.current = tid
    }
    const ref = doc(db, 'users', user.uid, 'chatThreads', tid!)
    const payload = { messages: next, updatedAt: serverTimestamp() }
    if (isNew) {
      await setDoc(ref, { ...payload, title: userText.slice(0, 100), createdAt: serverTimestamp() })
    } else {
      await updateDoc(ref, payload)
    }
  }, [user])

  const getContext = useCallback(() => buildFinancialContext(data), [data])

  const send = useCallback(async (text: string, externalContext?: string) => {
    if (!text.trim() || sending) return
    setLastUserText(text)
    setSending(true)
    setError('')
    setPendingAction(null)
    try {
      const context = externalContext ?? getContext()
      const next = await sendChatMessage(messages, text, data, {
        onPending: (action) => setPendingAction(action),
        context,
      })
      setMessages(next)
      await persist(next, text)
    } catch (reason) {
      setError(mapError(reason))
    } finally {
      setSending(false)
    }
  }, [messages, sending, data, persist, getContext])

  const confirm = useCallback(async () => {
    if (!pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    setSending(true)
    setError('')
    try {
      const context = getContext()
      const collection = action.args.collection as 'incomes' | 'expenses' | 'accounts' | 'installments' | 'savingsGoals'
      const id = action.args.id as string
      if (action.tool === 'delete_item' && collection && id) {
        await data.remove(collection, id)
      } else if (action.tool === 'set_payment_status') {
        await data.setPaymentStatus(
          action.args.itemType as 'expense' | 'installment',
          action.args.itemId as string,
          action.args.month as string,
          action.args.isPaid as boolean,
        )
      } else if (action.tool === 'add_item') {
        const payload = action.args.payload as Record<string, unknown>
        await data.save(collection, payload as never)
      } else if (action.tool === 'update_item') {
        const payload = action.args.payload as Record<string, unknown>
        await data.save(collection, payload as never, id)
      } else {
        const result = await sendChatMessage(messages, `ดำเนินการ ${action.tool} ตามที่ตกลงแล้ว`, data, { context })
        setMessages(result)
        await persist(result, `ดำเนินการ ${action.tool}`)
        setSending(false)
        return
      }
      const confirmMsg: ChatMessage = { role: 'user', content: [{ type: 'text', text: `ยืนยัน: ${action.summary || `ดำเนินการ ${action.tool}`}` }] }
      const updatedMessages = [...messages, confirmMsg]
      const result = await sendChatMessage(updatedMessages, '', data, { context })
      setMessages(result)
      await persist(result, 'ยืนยัน')
    } catch (reason) {
      setError(mapError(reason))
    } finally {
      setSending(false)
    }
  }, [pendingAction, messages, data, persist, getContext])

  const cancel = useCallback(() => {
    if (!pendingAction) return
    setPendingAction(null)
    const cancelMsg: ChatMessage = { role: 'assistant', content: [{ type: 'text', text: 'ยกเลิกให้แล้วครับ ไม่ต้องกังวล ถ้าอยากทำอะไรบอกได้เลย' }] }
    const updated = [...messages, cancelMsg]
    setMessages(updated)
    void persist(updated, '')
  }, [pendingAction, messages, persist])

  const retry = useCallback(() => {
    if (lastUserText) void send(lastUserText)
  }, [lastUserText, send])

  const clearConversation = useCallback(() => {
    setMessages([])
    setError('')
    setPendingAction(null)
    threadIdRef.current = null
    setLastUserText('')
  }, [])

  const value = useMemo<AIChatValue>(() => ({
    messages, sending, error, send, retry, clearConversation, loadingThread, widgetOpen, setWidgetOpen, pendingAction, confirm, cancel,
  }), [messages, sending, error, send, retry, clearConversation, loadingThread, widgetOpen, setWidgetOpen, pendingAction, confirm, cancel])

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
}

export function useAIChat() {
  const value = useContext(AIChatContext)
  if (!value) throw new Error('useAIChat must be used inside AIChatProvider')
  return value
}

export { textOf }
