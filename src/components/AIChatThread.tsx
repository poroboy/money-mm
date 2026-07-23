import { Check, Copy, LoaderCircle, Send, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Highlight, themes } from 'prism-react-renderer'
import { useAIChat, textOf } from '../context/AIChatContext'
import { useData } from '../context/DataContext'
import { isConfigured } from '../lib/ai/client'
import { getSuggestedActions, type SuggestedAction } from '../lib/ai/actions'
import { getSmartSuggestions } from '../lib/ai/suggestions'

const MAX_TEXTAREA_HEIGHT = 160

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/^### /gm, '')
    .replace(/^## /gm, '')
    .replace(/^# /gm, '')
    .replace(/^[-*+] /gm, '')
    .replace(/^\d+\. /gm, '')
    .replace(/^> /gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^---+/gm, '')
}

function CopyButton({ content, label }: { content: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.cssText = 'position:fixed;opacity:0;'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'คัดลอกแล้ว' : label || 'คัดลอกข้อความ'}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-700 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </button>
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const trimmedCode = code.replace(/\n$/, '')
  const displayLang = language === 'text' ? 'plaintext' : language

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-slate-700/50 bg-[#011627]">
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/80 px-4 py-2">
        <span className="text-xs font-medium text-slate-400">{displayLang}</span>
        <CopyButton content={trimmedCode} label="คัดลอกโค้ด" />
      </div>
      <Highlight code={trimmedCode} language={language} theme={themes.nightOwl}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre className="overflow-x-auto p-4 text-[13px] leading-6" style={style} aria-label="บล็อกโค้ด">
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })} className="table-row">
                  <span className="table-cell w-8 select-none text-right text-slate-500">{i + 1}</span>
                  <span className="table-cell pl-4">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex w-fit max-w-[80%] items-start gap-3 rounded-2xl bg-slate-100 px-4 py-3.5 shadow-sm sm:px-5" role="status" aria-label="ผู้ช่วยกำลังตอบ">
      <div className="flex size-6 items-center justify-center rounded-full bg-[#173f2b]/10">
        <Sparkles size={14} className="text-[#173f2b]" />
      </div>
      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-slate-500">กำลังวิเคราะห์ข้อมูล</p>
        <div className="flex gap-1">
          <span className="ai-dot size-1.5 rounded-full bg-[#173f2b]" />
          <span className="ai-dot size-1.5 rounded-full bg-[#173f2b]" />
          <span className="ai-dot size-1.5 rounded-full bg-[#173f2b]" />
        </div>
      </div>
    </div>
  )
}

function SuggestedActions({ actions, onAction }: { actions: SuggestedAction[]; onAction: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={() => void onAction(action.prompt)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="ai-markdown break-words">
      <ReactMarkdown
        components={{
          pre: ({ children }) => {
            const child = children as React.ReactElement<{ className?: string; children?: string }>
            const className = child.props?.className ?? ''
            const code = child.props?.children ?? ''
            if (!className.startsWith('language-')) {
              return (
                <pre className="my-4 overflow-x-auto rounded-2xl bg-slate-900 px-4 py-3 text-[13px] leading-6 text-slate-100">
                  <code>{children}</code>
                </pre>
              )
            }
            return <CodeBlock code={code} language={className.replace('language-', '')} />
          },
          code: ({ children, className }) => {
            if (className?.startsWith('language-')) return null
            return (
              <code className="rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[13px] text-slate-800">
                {children}
              </code>
            )
          },
          table: ({ children }) => <TableWrapper>{children}</TableWrapper>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ConfirmationButtons({ onConfirm, onCancel, sending }: { onConfirm: () => void; onCancel: () => void; sending: boolean }) {
  return (
    <div className="flex gap-3" role="group" aria-label="ยืนยันการดำเนินการ">
      <button
        onClick={onConfirm}
        disabled={sending}
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
      >
        <ThumbsUp size={15} />
        ยืนยัน
      </button>
      <button
        onClick={onCancel}
        disabled={sending}
        className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
      >
        <ThumbsDown size={15} />
        ยกเลิก
      </button>
    </div>
  )
}

export function AIChatThread({ compact = false }: { compact?: boolean }) {
  const { messages, sending, error, send, retry, loadingThread, pendingAction, confirm, cancel } = useAIChat()
  const data = useData()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const smartSuggestions = useMemo(() => getSmartSuggestions(data), [data])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleScroll = () => {
      const threshold = 120
      setIsNearBottom(container.scrollHeight - container.scrollTop - container.clientHeight < threshold)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, sending, isNearBottom])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
  }, [input])

  if (!isConfigured()) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">
        ยังไม่ได้ตั้งค่า VITE_AI_PROXY_URL — ดูขั้นตอนตั้งค่าใน ai-proxy/README.md
      </div>
    )
  }

  if (loadingThread && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoaderCircle size={18} className="animate-spin text-[#173f2b]" />
        <span className="ml-2 text-xs text-slate-400">กำลังโหลดข้อความ…</span>
      </div>
    )
  }

  const submit = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    void send(text)
  }

  const filteredMessages = messages.filter((message) => textOf(message).trim().length > 0)

  return (
    <div className="flex h-full flex-col p-4 sm:p-5">
      <div ref={scrollRef} className={`flex-1 space-y-5 overflow-y-auto pr-1 ${compact ? 'max-h-[50vh]' : ''}`}>
        {filteredMessages.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 sm:px-5 sm:py-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Sparkles size={16} className="text-[#173f2b]" />
              ลองถามได้เลย เช่น
            </div>
            <div className="mt-4 grid gap-2.5">
              {smartSuggestions.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => void send(s.prompt)}
                  className="rounded-2xl bg-white px-4 py-3 text-left text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {filteredMessages.map((message, index) => (
              <div
                key={index}
                className={`group relative w-fit max-w-[80%] min-w-0 rounded-2xl px-4 py-3 text-[15px] leading-7 shadow-sm sm:px-5 ${
                  message.role === 'user' ? 'ml-auto bg-[#173f2b] text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="absolute -top-2.5 right-2 z-10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <CopyMessageButton content={textOf(message)} />
                  </div>
                )}
                {message.role === 'assistant' ? (
                  <MarkdownMessage content={textOf(message)} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">{textOf(message)}</div>
                )}
              </div>
            ))}

            {!sending && pendingAction && (
              <ConfirmationButtons onConfirm={confirm} onCancel={cancel} sending={sending} />
            )}

            {!sending && !pendingAction && (() => {
              const actions = getSuggestedActions(messages)
              if (actions.length === 0) return null
              return <SuggestedActions actions={actions} onAction={send} />
            })()}
          </>
        )}

        {sending && <TypingDots />}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm leading-relaxed text-red-700 shadow-sm" role="alert">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-red-200 text-[11px] font-bold text-red-700">!</span>
              <p>{error}</p>
            </div>
            <button
              onClick={retry}
              disabled={sending}
              aria-label="ลองอีกครั้ง"
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? 'กำลังส่ง...' : 'ลองอีกครั้ง'}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="mt-5 flex items-end gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={sending ? 'กำลังรอคำตอบ...' : 'พิมพ์คำถามหรือรายการที่ต้องการบันทึก…'}
          disabled={sending}
          rows={1}
          className="max-h-40 min-h-[52px] flex-1 resize-none rounded-[20px] border border-transparent bg-transparent px-4 py-3 text-[15px] leading-6 outline-none placeholder:text-slate-400 focus:border-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={sending || !input.trim()}
          aria-label="ส่งข้อความ"
          className="grid size-11 shrink-0 place-items-center self-center rounded-2xl bg-[#173f2b] text-white transition hover:bg-[#22563c] focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </div>
    </div>
  )
}

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const plain = stripMarkdown(content)
    try {
      await navigator.clipboard.writeText(plain)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = plain
      textarea.style.cssText = 'position:fixed;opacity:0;'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    >
      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
    </button>
  )
}
