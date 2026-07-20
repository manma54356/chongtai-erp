import { useState, useRef, useEffect } from 'react'
import { Input, Button, Typography, Spin, Alert, Avatar } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, ClearOutlined } from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'

const { Text } = Typography
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface Message {
  role: 'user' | 'assistant'
  content: string
  pending?: boolean
}

const WELCOME = '您好！我是重泰開發ERP的AI財務助理，由 Claude Fable 5 驅動。\n\n我可以協助您解答：\n• 會計科目與傳票問題\n• 請款流程與應付帳款\n• 預算分析與財務報表\n• 建案管理相關事宜\n\n請問有什麼需要協助的？'

export default function AIAssistantPage() {
  const { token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)

    const userMsg: Message = { role: 'user', content: text }
    const assistantMsg: Message = { role: 'assistant', content: '', pending: true }

    const history = [...messages.filter(m => !m.pending), userMsg]
    setMessages([...history, assistantMsg])
    setLoading(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload) continue
          const parsed = JSON.parse(payload) as { text?: string; error?: string; done?: boolean }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.done) break
          if (parsed.text) {
            accumulated += parsed.text
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: accumulated, pending: true }
              return next
            })
          }
        }
      }

      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: accumulated }
        return next
      })
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const clearChat = () => {
    abortRef.current?.abort()
    setMessages([{ role: 'assistant', content: WELCOME }])
    setInput('')
    setError(null)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ fontSize: 20, color: '#C9993E' }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>AI 財務助理</span>
          <Text type="secondary" style={{ fontSize: 12 }}>powered by Claude Fable 5</Text>
        </div>
        <Button icon={<ClearOutlined />} size="small" onClick={clearChat}>清除對話</Button>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <Avatar
              icon={msg.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
              style={{ background: msg.role === 'assistant' ? '#0F2647' : '#C9993E', flexShrink: 0 }}
            />
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: 12,
              background: msg.role === 'user' ? '#0F2647' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#222',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14,
              borderTopLeftRadius: msg.role === 'assistant' ? 2 : 12,
              borderTopRightRadius: msg.role === 'user' ? 2 : 12,
            }}>
              {msg.content}
              {msg.pending && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <Alert type="error" message={error} closable onClose={() => setError(null)}
          style={{ marginTop: 8 }} />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Input.TextArea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="輸入問題… (Enter 送出，Shift+Enter 換行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <Button
          type="primary" icon={<SendOutlined />} onClick={send}
          loading={loading} disabled={!input.trim()}
          style={{ background: '#0F2647', borderColor: '#0F2647', alignSelf: 'flex-end' }}
        >
          送出
        </Button>
      </div>
    </div>
  )
}
