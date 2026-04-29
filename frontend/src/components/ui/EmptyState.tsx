import { Inbox } from 'lucide-react'

interface Props {
  message?: string
  hint?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({
  message = 'Nada por aqui ainda.',
  hint,
  action,
}: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '40px 16px',
      background: 'var(--bg-card)',
      border: '1px dashed var(--border-strong)',
      borderRadius: 'var(--radius-lg)',
      textAlign: 'center',
    }}>
      <Inbox size={28} color="var(--text-muted)" />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600, fontSize: '0.95rem',
        color: 'var(--text-secondary)',
      }}>
        {message}
      </div>
      {hint && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.5,
        }}>
          {hint}
        </div>
      )}
      {action && (
        <button
          className="btn btn-ghost"
          onClick={action.onClick}
          style={{ fontSize: '0.7rem', padding: '6px 14px', marginTop: '4px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
