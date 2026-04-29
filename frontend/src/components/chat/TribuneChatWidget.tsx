import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle, X, Maximize2, Send, Zap, Microscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { nflApi, ChatMessage } from '../../api/nflApi'

type Mode = 'rag' | 'agent'
type WidgetMessage =
  | { kind: 'user'; text: string }
  | { kind: 'rag'; text: string; sources?: any[] }
  | { kind: 'agent'; text: string; steps?: any[] }
  | { kind: 'error'; text: string }

const STORAGE_KEY = 'tribune-chat-history'
const MAX_HISTORY = 50

function loadHistory(): WidgetMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(msgs: WidgetMessage[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY))) }
  catch { /* localStorage cheio: ignorar */ }
}

export default function TribuneChatWidget() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('rag')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<WidgetMessage[]>(() => loadHistory())
  const [interacted, setInteracted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { saveHistory(messages) }, [messages])
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages])

  const ragMutation = useMutation({
    mutationFn: ({ q, hist }: { q: string; hist: ChatMessage[] }) => nflApi.chat(q, hist),
    onSuccess: data => setMessages(prev => [...prev, { kind: 'rag', text: data.answer, sources: data.sources }]),
    onError: () => setMessages(prev => [...prev, { kind: 'error', text: 'Não consegui responder agora. Tenta de novo?' }]),
  })

  const agentMutation = useMutation({
    mutationFn: (q: string) => nflApi.askAgent(q),
    onSuccess: data => setMessages(prev => [...prev, { kind: 'agent', text: data.answer, steps: data.steps }]),
    onError: () => setMessages(prev => [...prev, { kind: 'error', text: 'O agente falhou. Tenta de novo?' }]),
  })

  const send = () => {
    const q = input.trim()
    if (!q) return
    setInteracted(true)
    setMessages(prev => [...prev, { kind: 'user', text: q }])
    setInput('')
    if (mode === 'rag') {
      const hist = messages
        .filter(m => m.kind === 'user' || m.kind === 'rag')
        .map(m => ({ role: m.kind === 'user' ? 'user' as const : 'assistant' as const, content: m.text }))
      ragMutation.mutate({ q, hist })
    } else {
      agentMutation.mutate(q)
    }
  }

  const isPending = ragMutation.isPending || agentMutation.isPending

  // ── Estado fechado: bolinha flutuante ───────────────────────
  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setInteracted(true) }}
        aria-label="Abrir chat com a IA"
        style={{
          position: 'fixed', right: '24px', bottom: '24px',
          width: '56px', height: '56px',
          borderRadius: '50%',
          background: 'var(--green-field)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,168,67,0.32)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          animation: interacted ? 'none' : 'tribune-pulse 3s ease-in-out infinite',
        }}
      >
        <MessageCircle size={22} />
        <style>{`
          @keyframes tribune-pulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.06); }
          }
        `}</style>
      </button>
    )
  }

  // ── Estado aberto: painel ─────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chat Tribune AI"
      className="tribune-widget-open"
      style={{
        position: 'fixed', right: '24px', bottom: '24px',
        width: '380px', height: '520px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        background: 'var(--green-glow)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '0.9rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          💬 Tribune AI
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          {mode === 'agent' && (
            <Link to="/agent" aria-label="Abrir Agente em tela cheia"
                  style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <Maximize2 size={14} />
            </Link>
          )}
          <button onClick={() => setOpen(false)} aria-label="Fechar chat"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Toggle de modo */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {([
          { value: 'rag' as Mode,   icon: Zap,        label: 'Pergunta rápida' },
          { value: 'agent' as Mode, icon: Microscope, label: 'Análise profunda' },
        ]).map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            style={{
              flex: 1,
              padding: '8px',
              background: mode === value ? 'var(--bg-card-hover)' : 'transparent',
              border: 'none',
              borderBottom: mode === value ? '2px solid var(--green-field)' : '2px solid transparent',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: mode === value ? 'var(--text-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Mensagens */}
      <div
        aria-live="polite"
        style={{
          flex: 1, overflowY: 'auto',
          padding: '12px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
          background: 'var(--bg-field)',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.72rem' }}>
            {mode === 'rag'
              ? 'Pergunta sobre EPA, formações, regras, jogadores...'
              : 'Pergunta complexa pra IA raciocinar com ferramentas (rankings, hot-seat, predições).'}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.kind === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '8px 12px',
            borderRadius: m.kind === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
            background: m.kind === 'user' ? 'var(--green-glow)'
                      : m.kind === 'error' ? 'var(--red-glow)'
                      : 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.55,
          }}>
            {m.text}
            {m.kind === 'rag' && m.sources && m.sources.length > 0 && (
              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {m.sources.slice(0, 3).map((s: any, idx: number) => (
                  <span key={idx} style={{
                    fontSize: '0.6rem',
                    padding: '1px 6px',
                    background: 'var(--blue-glow)',
                    color: 'var(--blue-data)',
                    borderRadius: '2px',
                  }}>
                    📄 {s.title}
                  </span>
                ))}
              </div>
            )}
            {m.kind === 'agent' && m.steps && m.steps.length > 0 && (
              <details style={{ marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                <summary style={{ cursor: 'pointer' }}>Ver {m.steps.length} passo(s)</summary>
                {m.steps.map((s: any, idx: number) => (
                  <div key={idx} style={{ paddingLeft: '8px', marginTop: '4px' }}>
                    {s.thought ?? `🔧 ${s.tool}`}
                  </div>
                ))}
              </details>
            )}
          </div>
        ))}
        {isPending && (
          <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
            <span className="loading-dot" /> Pensando...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: '6px', padding: '8px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pergunta..."
          style={{
            flex: 1, padding: '6px 10px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || isPending}
          aria-label="Enviar"
          style={{
            padding: '6px 12px',
            background: 'var(--green-field)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: input.trim() && !isPending ? 'pointer' : 'not-allowed',
            opacity: input.trim() && !isPending ? 1 : 0.4,
            display: 'flex', alignItems: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
