import { useTeam } from '../../hooks/useTeamInfo'

interface Props {
  abbr: string
  /** Se true, renderiza ativo (borda mais grossa, fundo levemente colorido) */
  active?: boolean
  onClick?: () => void
  /** "compact" só mostra logo + sigla, "full" mostra também a cidade */
  variant?: 'compact' | 'full'
}

export default function TeamChip({ abbr, active = false, onClick, variant = 'compact' }: Props) {
  const team = useTeam(abbr)

  // Fallback durante loading: sigla pura, sem layout shift
  if (!team) {
    return (
      <button
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', border: '1px solid var(--border)',
          background: 'transparent', borderRadius: '2px',
          fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
          color: 'var(--text-muted)', fontWeight: 700,
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {abbr}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 10px',
        border: `1px solid ${active ? team.color : 'var(--border)'}`,
        borderLeft: `3px solid ${team.color}`,
        background: active ? `${team.color}22` : 'transparent',
        borderRadius: '2px',
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = `${team.color}11`
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <img
        src={team.logo}
        alt={team.abbr}
        style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <span>{team.abbr}</span>
      {variant === 'full' && (
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.65rem' }}>
          {team.city}
        </span>
      )}
    </button>
  )
}
