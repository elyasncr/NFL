import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { nflApi, ChatMessage, ChatSource } from '../api/nflApi'
import { Send, BookOpen, Zap, RefreshCw } from 'lucide-react'

const SUGGESTED = [
  "O que é EPA e como é calculado?",
  "Qual a diferença entre Cover 2 e Cover 3?",
  "Por que o CPOE é melhor que completion%?",
  "Explica como o XGBoost prediz vitórias neste projeto",
  "O que é Success Rate e como evita o garbage time?",
  "Como funciona o RAG neste sistema?",
]

function SourceBadge({ source }: { source: ChatSource }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      background: 'rgba(68,138,255,0.1)',
      border: '1px solid rgba(68,138,255,0.3)',
      borderRadius: '2px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.62rem',
      color: 'var(--blue-data)',
      cursor: 'default',
    }}
    title={source.excerpt}
    >
      <BookOpen size={9} />
      {source.title}
      <span style={{ opacity: 0.6 }}>{(source.similarity * 100).toFixed(0)}%</span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '12px',
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        fontWeight: 700,
        background: isUser ? 'var(--green-glow)' : 'rgba(68,138,255,0.1)',
        border: `1px solid ${isUser ? 'var(--green-field)' : 'var(--blue-data)'}`,
        color: isUser ? 'var(--green-field)' : 'var(--blue-data)',
      }}>
        {isUser ? 'EU' : 'AI'}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          padding: '14px 18px',
          borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          background: isUser ? 'rgba(0,230,118,0.08)' : 'var(--bg-card)',
          border: `1px solid ${isUser ? 'var(--border-active)' : 'var(--border)'}`,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          lineHeight: '1.7',
          color: 'var(--text-primary)',
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '4px' }}>
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: ragStatus } = useQuery({ queryKey: ['rag-status'], queryFn: nflApi.getRagStatus })

  const ingestMutation = useMutation({
    mutationFn: () => nflApi.ingestDocuments(false),
    onSuccess: () => { window.location.reload() }
  })

  const chatMutation = useMutation({
    mutationFn: ({ question, history }: { question: string; history: ChatMessage[] }) =>
      nflApi.chat(question, history),
    onSuccess: (data, variables) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources }
      ])
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao conectar com a API. Verifique se o backend está rodando.' }])
    }
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  const sendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    chatMutation.mutate({ question: text, history: messages })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            NFL Chat <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ RAG + LLM</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pergunte sobre regras, métricas, táticas e o projeto em si · Ollama (llama3) local
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {ragStatus && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: ragStatus.ready ? 'var(--green-field)' : 'var(--amber-warn)',
            }}>
              {ragStatus.documents_indexed} docs indexados
            </span>
          )}
          {ragStatus && !ragStatus.ready && (
            <button
              className="btn btn-primary"
              onClick={() => ingestMutation.mutate()}
              disabled={ingestMutation.isPending}
              style={{ fontSize: '0.7rem', padding: '6px 14px' }}
            >
              <Zap size={12} /> Indexar Base
            </button>
          )}
          {messages.length > 0 && (
            <button className="btn btn-ghost" onClick={() => setMessages([])} style={{ fontSize: '0.7rem', padding: '6px 12px' }}>
              <RefreshCw size={12} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '4px 0',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '24px' }}>
              FAÇA UMA PERGUNTA
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '680px', margin: '0 auto' }}>
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-active)'; (e.target as HTMLElement).style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {chatMutation.isPending && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(68,138,255,0.1)', border: '1px solid var(--blue-data)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--blue-data)', fontWeight: 700 }}>AI</div>
            <div style={{ padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: '6px' }}>
              {[0, 1, 2].map(i => (
                <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
          placeholder="Pergunte sobre EPA, formações, regras, o projeto..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || chatMutation.isPending}
          className="btn btn-primary"
          style={{ padding: '8px 16px', opacity: (!input.trim() || chatMutation.isPending) ? 0.4 : 1 }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
