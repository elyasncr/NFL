import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  message?: string
  details?: string
  onRetry?: () => void
}

export default function ErrorState({
  message = 'Algo deu errado por aqui.',
  details,
  onRetry,
}: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '32px 16px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--red-alert)',
      borderRadius: 'var(--radius-lg)',
      textAlign: 'center',
    }}>
      <AlertCircle size={28} color="var(--red-alert)" />
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700, fontSize: '1.05rem',
        color: 'var(--text-primary)',
      }}>
        {message}
      </div>
      {onRetry && (
        <button
          className="btn btn-ghost"
          onClick={onRetry}
          style={{ fontSize: '0.7rem', padding: '6px 14px' }}
        >
          <RefreshCw size={12} /> Tentar de novo
        </button>
      )}
      {details && (
        <details style={{ marginTop: '8px', maxWidth: '90%' }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            Detalhes técnicos
          </summary>
          <pre style={{
            marginTop: '6px',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            background: 'var(--bg-field)',
            padding: '8px',
            borderRadius: 'var(--radius)',
            overflowX: 'auto',
            textAlign: 'left',
          }}>
            {details}
          </pre>
        </details>
      )}
    </div>
  )
}
