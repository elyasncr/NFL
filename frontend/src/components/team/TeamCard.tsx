import { useTeam } from '../../hooks/useTeamInfo'

interface Props {
  abbr: string
  /** Texto do label superior, ex "Melhor Ataque" */
  label?: string
  /** Métrica destacada embaixo, ex "+0.2027 EPA/play" */
  metric?: { value: string; suffix?: string }
}

export default function TeamCard({ abbr, label, metric }: Props) {
  const team = useTeam(abbr)

  if (!team) {
    return (
      <div className="card" style={{ minHeight: '180px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
          {label || ''}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '12px' }}>
          {abbr}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${team.color}55 0%, ${team.color}1A 50%, var(--bg-card) 100%)`,
      border: `1px solid ${team.color}99`,
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '180px',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      {/* Glow corner */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '140px', height: '140px',
        background: `radial-gradient(circle, ${team.color2}55 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Header: label + division badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {label || ''}
        </div>
        <div style={{
          padding: '2px 8px',
          background: `${team.color2}33`,
          border: `1px solid ${team.color2}66`,
          borderRadius: '2px',
          fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
          color: team.color2, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {team.division}
        </div>
      </div>

      {/* Logo + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
        <img
          src={team.logo}
          alt={team.abbr}
          style={{
            width: '54px', height: '54px', objectFit: 'contain',
            filter: `drop-shadow(0 0 8px ${team.color}80)`,
            flexShrink: 0,
          }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem',
            lineHeight: 1, color: '#ffffff', letterSpacing: '0.02em', textTransform: 'uppercase',
          }}>
            {team.city}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem',
            lineHeight: 1.2, color: team.color2, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {team.nick}
          </div>
        </div>
      </div>

      {/* Métrica */}
      {metric && (
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem',
          color: 'var(--green-field)', position: 'relative',
        }}>
          {metric.value}
          {metric.suffix && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
              {metric.suffix}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
