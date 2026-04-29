import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { nflApi, AgentStep, ChatMessage } from '../api/nflApi'
import { Send, Cpu, Wrench, ChevronDown, ChevronRight, Zap } from 'lucide-react'

const SUGGESTED = [
  "Quem vai ganhar: KC em casa contra SF?",
  "O QB do NE deveria ser banquado pelos dados?",
  "Qual o melhor ataque da liga agora e por quê?",
  "Compara BUF e MIA usando EPA e probabilidade de vitória",
  "Me explica o que é EPA e qual time tem o maior da liga",
]

function StepCard({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(step.type === 'tool_result')

  const config = {
    thinking: { color: 'var(--text-muted)', icon: '💭', label: 'Raciocínio' },
    tool_call: { color: 'var(--amber-warn)', icon: '🔧', label: `Ferramenta: ${step.tool}` },
    tool_result: { color: 'var(--blue-data)', icon: '📊', label: 'Resultado' },
    answer: { color: 'var(--green-field)', icon: '✅', label: 'Resposta Final' },
  }[step.type]

  return (
    <div style={{
      borderLeft: `2px solid ${config.color}`,
      paddingLeft: '12px',
      marginBottom: '8px',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.8rem' }}>{config.icon}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: config.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {config.label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', flex: 1 }}>
          — {step.content}
        </span>
        {step.data && (expanded ? <ChevronDown size={12} color="var(--text-muted)" /> : <ChevronRight size={12} color="var(--text-muted)" />)}
      </button>

      {expanded && step.data && (
        <div style={{
          marginTop: '6px',
          padding: '8px 12px',
          background: 'var(--bg-field)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-secondary)',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
        }}>
          {typeof step.data === 'object' ? JSON.stringify(step.data, null, 2) : step.data}
        </div>
      )}

      {expanded && step.args && (
        <div style={{
          marginTop: '4px',
          padding: '6px 10px',
          background: 'var(--amber-glow)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--amber-warn)',
        }}>
          Args: {JSON.stringify(step.args)}
        </div>
      )}
    </div>
  )
}

interface ConversationItem {
  question: string
  answer: string
  steps: AgentStep[]
  tools_used: string[]
}

export default function Agent() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [expandedSteps, setExpandedSteps] = useState<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const agentMutation = useMutation({
    mutationFn: (question: string) => nflApi.askAgent(question, history),
    onSuccess: (data, question) => {
      setConversations(prev => [...prev, {
        question,
        answer: data.answer,
        steps: data.steps,
        tools_used: data.tools_used,
      }])
      setHistory(prev => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: data.answer },
      ])
      setExpandedSteps(prev => [...prev, conversations.length])
    }
  })

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversations, agentMutation.isPending])

  const send = (text: string) => {
    if (!text.trim() || agentMutation.isPending) return
    setInput('')
    agentMutation.mutate(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 140px)' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          AI Agent <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ ReAct + Tools</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Esta IA tem acesso a estatísticas ao vivo. Ela decide quais dados buscar pra responder você.
        </p>
      </div>

      {/* Tools available */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['get_team_stats', 'predict_matchup', 'check_qb_hot_seat', 'search_nfl_knowledge', 'get_team_rankings'].map(t => (
          <span key={t} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 10px',
            background: 'var(--purple-glow)',
            border: '1px solid var(--purple-ai)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--purple-ai)',
          }}>
            <Wrench size={9} /> {t}
          </span>
        ))}
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {conversations.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '30px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '20px' }}>
              PERGUNTE EM LINGUAGEM NATURAL
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '680px', margin: '0 auto' }}>
              {SUGGESTED.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{
                  padding: '8px 14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-active)' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
                >
                  <Zap size={10} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversations.map((conv, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* User question */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                padding: '12px 16px',
                background: 'var(--green-glow)',
                border: '1px solid var(--green-field)',
                borderRadius: '12px 12px 2px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                color: 'var(--text-primary)',
                maxWidth: '70%',
              }}>
                {conv.question}
              </div>
            </div>

            {/* Reasoning steps */}
            <div className="card">
              <button
                onClick={() => setExpandedSteps(prev =>
                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                )}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 0 10px 0',
                  width: '100%',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '12px',
                }}
              >
                <Cpu size={13} color="var(--purple-ai)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--purple-ai)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Cadeia de Raciocínio
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {conv.steps.length} passos · {conv.tools_used.join(', ') || 'sem ferramentas'}
                </span>
                {expandedSteps.includes(idx)
                  ? <ChevronDown size={12} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                  : <ChevronRight size={12} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                }
              </button>

              {expandedSteps.includes(idx) && (
                <div style={{ marginBottom: '16px' }}>
                  {conv.steps.map((step, si) => <StepCard key={si} step={step} />)}
                </div>
              )}

              {/* Final answer */}
              <div style={{
                padding: '14px',
                background: 'var(--bg-field)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                lineHeight: '1.7',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                borderLeft: '3px solid var(--green-field)',
              }}>
                {conv.answer}
              </div>
            </div>
          </div>
        ))}

        {agentMutation.isPending && (
          <div className="card" style={{ borderColor: 'var(--purple-ai)', borderWidth: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Cpu size={14} color="var(--purple-ai)" style={{ animation: 'pulse 1s infinite' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Agente raciocinando...
              </span>
              {[0, 1, 2].map(i => <span key={i} className="loading-dot" style={{ animationDelay: `${i * 0.2}s` }} />)}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          placeholder="Pergunta algo profundo sobre NFL — a IA pode chamar dados ao vivo."
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}
        />
        <button onClick={() => send(input)} disabled={!input.trim() || agentMutation.isPending}
          className="btn" style={{ padding: '8px 16px', background: 'var(--purple-ai)', color: 'white', opacity: (!input.trim() || agentMutation.isPending) ? 0.4 : 1 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
