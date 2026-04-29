import { TrendingUp, Shield, AlertTriangle, Sparkles } from 'lucide-react'
import { useTeam } from '../../hooks/useTeamInfo'

const PLAYS_PER_GAME = 62

function epaToPointsPerGame(epa: number): number {
  return Math.round(Math.abs(epa) * PLAYS_PER_GAME * 10) / 10
}

export type ChampionVariant = 'attack' | 'defense' | 'qb-trouble' | 'surprise'

interface Props {
  variant: ChampionVariant
  abbr: string
  epaValue: number
  /** Texto custom no rodapé (sobrescreve a frase didática default) */
  description?: string
  /** Métrica custom no rodapé (sobrescreve "+X.XXX EPA por jogada") */
  metricLabel?: string
}

const CONFIG: Record<ChampionVariant, { icon: React.ElementType; label: string }> = {
  attack:        { icon: TrendingUp,    label: 'O Melhor Ataque da Temporada' },
  defense:       { icon: Shield,        label: 'A Melhor Defesa da Temporada' },
  'qb-trouble':  { icon: AlertTriangle, label: 'QB em Apuros' },
  surprise:      { icon: Sparkles,      label: 'A Surpresa do Ano' },
}

function defaultDescription(variant: ChampionVariant, epa: number, teamCity?: string): string {
  const points = epaToPointsPerGame(epa)
  switch (variant) {
    case 'attack':
      return `Cria em média ~${points} pontos a mais por jogo do que um time mediano. O ataque mais letal da NFL na temporada 2025-2026.`
    case 'defense':
      return `Impede em média ~${points} pontos por jogo comparado ao que um adversário tipicamente faz. A defesa que mais sufoca jogadas.`
    case 'qb-trouble':
      return `O quarterback de ${teamCity ?? 'aqui'} é quem mais corre risco de perder o lugar — métrica ruim, tendência negativa.`
    case 'surprise':
      return `${teamCity ?? 'Esse time'} surpreendeu em 2025. Saiu da expectativa pré-temporada e entregou números acima da média da liga.`
  }
}

export default function ChampionCard({ variant, abbr, epaValue, description, metricLabel }: Props) {
  const team = useTeam(abbr)
  const cfg = CONFIG[variant]
  const Icon = cfg.icon

  if (!team) {
    return (
      <div className="card" style={{ minHeight: '220px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{cfg.label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '12px' }}>{abbr}</div>
      </div>
    )
  }

  const finalDesc = description ?? defaultDescription(variant, epaValue, team.city)
  const sign = epaValue >= 0 ? '+' : ''

  return (
    <div style={{
      background: `linear-gradient(135deg, ${team.color}40 0%, ${team.color}10 55%, var(--bg-card) 100%)`,
      border: `1px solid ${team.color}55`,
      borderLeft: `4px solid ${team.color}`,
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      minHeight: '220px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      cursor: 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}>
      {/* Glow corner */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '180px', height: '180px',
        background: `radial-gradient(circle, ${team.color2}40 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Header label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <Icon size={14} color={team.color} />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {cfg.label}
        </span>
      </div>

      {/* Logo + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
        <img
          src={team.logo}
          alt={team.abbr}
          style={{
            width: '80px', height: '80px', objectFit: 'contain',
            filter: `drop-shadow(0 0 12px ${team.color}80)`,
            flexShrink: 0,
          }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem',
            color: 'var(--text-primary)', letterSpacing: '0.02em',
            textTransform: 'uppercase', lineHeight: 1,
          }}>
            {team.city}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem',
            color: team.color, letterSpacing: '0.04em',
            textTransform: 'uppercase', lineHeight: 1.1, marginTop: '2px',
          }}>
            {team.nick}
          </div>
        </div>
      </div>

      {/* Frase didática */}
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
        color: 'var(--text-secondary)', lineHeight: 1.65,
        margin: 0, position: 'relative',
      }}>
        {finalDesc}
      </p>

      {/* Métrica técnica no rodapé */}
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: '8px',
          position: 'relative', marginTop: 'auto',
          paddingTop: '12px', borderTop: '1px dashed var(--border)',
        }}
        title={`Métrica técnica: ${sign}${epaValue.toFixed(4)} EPA por jogada`}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem',
          color: team.color, letterSpacing: '0.04em',
        }}>
          {sign}{epaValue.toFixed(3)}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
          color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {metricLabel ?? 'EPA por jogada'}
        </span>
      </div>
    </div>
  )
}
