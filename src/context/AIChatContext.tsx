import { collection, doc, getDocs, orderBy, query, limit, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { sendChatMessage, textOf, type ChatMessage } from '../lib/ai/client'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'

type AIChatValue = {
  messages: ChatMessage[]
  sending: boolean
  error: string
  send: (text: string) => Promise<void>
  retry: () => void
  newChat: () => void
  loadingThread: boolean
  widgetOpen: boolean
  setWidgetOpen: (value: boolean) => void
}

const AIChatContext = createContext<AIChatValue | null>(null)

function mapError(error: unknown): string {
  const message = (error as Error)?.message || ''
  if (message.includes('VITE_AI_PROXY_URL')) return 'การตั้งค่า AI ยังไม่สมบูรณ์'
  if (message.includes('429') || message.includes('Too Many Requests') || message.includes('rate limit')) return 'ระบบ AI กำลังมีผู้ใช้หนาแน่น กรุณาลองใหม่ในอีกสักครู่'
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Network request failed') || message.includes('fetch')) return 'ไม่สามารถเชื่อมต่อกับระบบ AI ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
  if (message.includes('401') || message.includes('Unauthorized') || message.includes('403') || message.includes('Forbidden')) return 'การยืนยันตัวตนกับระบบ AI ล้มเหลว กรุณาตรวจสอบการตั้งค่า'
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('Internal Server Error') || message.includes('Bad Gateway') || message.includes('Service Unavailable')) return 'เซิร์ฟเวอร์ AI มีปัญหา กรุณาลองใหม่ในภายหลัง'
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

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return
    setLastUserText(text)
    setSending(true)
    setError('')
    try {
      const next = await sendChatMessage(messages, text, data)
      setMessages(next)
      await persist(next, text)
    } catch (reason) {
      setError(mapError(reason))
    } finally {
      setSending(false)
    }
  }, [messages, sending, data, persist])

  const retry = useCallback(() => {
    if (lastUserText) void send(lastUserText)
  }, [lastUserText, send])

  const newChat = useCallback(() => {
    setMessages([])
    setError('')
    threadIdRef.current = null
    setLastUserText('')
  }, [])

  const value = useMemo<AIChatValue>(() => ({
    messages, sending, error, send, retry, newChat, loadingThread, widgetOpen, setWidgetOpen,
  }), [messages, sending, error, send, retry, newChat, loadingThread, widgetOpen])

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
}

export function useAIChat() {
  const value = useContext(AIChatContext)
  if (!value) throw new Error('useAIChat must be used inside AIChatProvider')
  return value
}

export { textOf }
