import { useTeam } from '../../hooks/useTeamInfo'
import { useCountUp } from '../../hooks/useCountUp'

interface Props {
  /** Time campeão do SB */
  championAbbr: string
  /** Time vice */
  runnerUpAbbr: string
  championScore: number
  runnerUpScore: number
  date: string  // "2026-02-08"
  /** Manchete editorial. Default: "{Champion} conquistam o Super Bowl LX" */
  headline?: string
  /** Sub-manchete coloquial */
  subHeadline?: string
}

export default function TribuneHero({
  championAbbr, runnerUpAbbr,
  championScore, runnerUpScore,
  date, headline, subHeadline,
}: Props) {
  const champ = useTeam(championAbbr)
  const runner = useTeam(runnerUpAbbr)
  const [champScore, champRef] = useCountUp(championScore, { duration: 800 })
  const [runnerScore, runnerRef] = useCountUp(runnerUpScore, { duration: 800 })

  const finalHeadline = headline ?? (champ ? `${champ.city} conquistam o Super Bowl LX` : 'Super Bowl LX')
  const finalSub = subHeadline ?? (
    champ && runner
      ? `${championScore}-${runnerUpScore} sobre os ${runner.nick} num jogo decidido nos detalhes.`
      : ''
  )

  return (
    <div className="tribune-hero" style={{
      background: '#0d1419',
      color: '#fff',
      borderRadius: 'var(--radius-lg)',
      padding: '40px 32px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '32px',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '320px',
    }}>
      {/* Glow do time campeão atrás */}
      {champ && (
        <div style={{
          position: 'absolute', left: '-60px', top: '-60px',
          width: '320px', height: '320px',
          background: `radial-gradient(circle, ${champ.color}55 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Logo do campeão */}
      {champ && (
        <img
          src={champ.logo}
          alt={champ.abbr}
          loading="lazy"
          style={{
            width: '160px', height: '160px', objectFit: 'contain',
            filter: `drop-shadow(0 0 24px ${champ.color}aa)`,
            position: 'relative',
          }}
        />
      )}

      {/* Manchete + sub */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'inline-block',
          background: champ?.color ?? 'var(--green-field)',
          padding: '4px 10px',
          borderRadius: '2px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}>
          🏆 SUPER BOWL LX · {date}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '2.6rem',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          lineHeight: 1.05,
          marginBottom: '10px',
        }}>
          {finalHeadline}
        </h1>
        {finalSub && (
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.55,
            maxWidth: '640px',
          }}>
            {finalSub}
          </p>
        )}
      </div>

      {/* Placar count-up */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'relative',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
      }}>
        <div ref={champRef} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.6, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            {champ?.abbr ?? championAbbr}
          </div>
          <div style={{ fontSize: '3.4rem', color: champ?.color ?? '#fff', lineHeight: 1, marginTop: '4px' }}>
            {champScore}
          </div>
        </div>
        <div style={{ fontSize: '1.6rem', opacity: 0.4 }}>×</div>
        <div ref={runnerRef} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.6rem', opacity: 0.6, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
            {runner?.abbr ?? runnerUpAbbr}
          </div>
          <div style={{ fontSize: '3.4rem', color: runner?.color2 ?? 'rgba(255,255,255,0.6)', lineHeight: 1, marginTop: '4px' }}>
            {runnerScore}
          </div>
        </div>
      </div>
    </div>
  )
}
