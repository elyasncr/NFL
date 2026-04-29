import { useTeam } from '../../hooks/useTeamInfo'

interface HeroSideProps {
  abbr: string
  side: 'home' | 'away'
}

function HeroSide({ abbr, side }: HeroSideProps) {
  const team = useTeam(abbr)
  if (!team) {
    return (
      <div style={{ textAlign: 'center', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-muted)' }}>{abbr}</span>
      </div>
    )
  }

  const sideLabel = side === 'home' ? 'CASA' : 'VISITANTE'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      position: 'relative', padding: '8px',
    }}>
      <img
        src={team.logo}
        alt={team.abbr}
        style={{
          width: '110px', height: '110px', objectFit: 'contain',
          filter: `drop-shadow(0 0 16px ${team.color}99)`,
        }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem',
        color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
      }}>
        {team.city}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem',
        color: team.color2, letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {team.nick}
      </div>
      <div style={{
        marginTop: '4px', padding: '2px 8px',
        background: `${team.color}33`,
        border: `1px solid ${team.color}66`,
        borderRadius: '2px',
        fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
        color: team.color2, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {sideLabel} · {team.division}
      </div>
    </div>
  )
}

interface Props {
  homeAbbr: string
  awayAbbr: string
  /** Texto opcional pro centro (ex: "79.1% / 20.9%") */
  centerText?: string
  centerLabel?: string
}

export default function TeamHero({ homeAbbr, awayAbbr, centerText, centerLabel }: Props) {
  const home = useTeam(homeAbbr)
  const away = useTeam(awayAbbr)
  const homeColor = home?.color ?? '#888888'
  const awayColor = away?.color ?? '#888888'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '24px',
      alignItems: 'center',
      padding: '32px 24px',
      background: `linear-gradient(90deg, ${homeColor}33 0%, ${homeColor}0A 35%, transparent 50%, ${awayColor}0A 65%, ${awayColor}33 100%)`,
      border: `1px solid ${homeColor}55`,
      borderRadius: 'var(--radius-lg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glows nos cantos */}
      <div style={{
        position: 'absolute', top: '-40px', left: '-40px',
        width: '180px', height: '180px',
        background: `radial-gradient(circle, ${homeColor}40 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: '180px', height: '180px',
        background: `radial-gradient(circle, ${awayColor}40 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <HeroSide abbr={homeAbbr} side="home" />

      {/* Centro */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.5rem',
          color: 'var(--text-muted)', letterSpacing: '0.1em',
        }}>
          VS
        </div>
        {centerLabel && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.55rem',
            color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {centerLabel}
          </div>
        )}
        {centerText && (
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem',
            color: 'var(--green-field)',
          }}>
            {centerText}
          </div>
        )}
      </div>

      <HeroSide abbr={awayAbbr} side="away" />
    </div>
  )
}
