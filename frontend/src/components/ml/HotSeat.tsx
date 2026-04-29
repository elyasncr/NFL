import { useQuery } from '@tanstack/react-query'
import { nflApi, HotSeatResult } from '../../api/nflApi'
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

const NFL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

interface Props {
  team: string
  onTeamChange?: (team: string) => void
}

const severityConfig = {
  'CRÍTICO': {
    bg: 'rgba(255,23,68,0.08)',
    border: 'var(--red-alert)',
    color: 'var(--red-alert)',
    icon: AlertTriangle,
    pulse: true,
  },
  'ALERTA': {
    bg: 'rgba(255,171,0,0.08)',
    border: 'var(--amber-warn)',
    color: 'var(--amber-warn)',
    icon: AlertTriangle,
    pulse: false,
  },
  'ATENÇÃO': {
    bg: 'rgba(255,171,0,0.05)',
    border: 'var(--amber-warn)',
    color: 'var(--amber-warn)',
    icon: Minus,
    pulse: false,
  },
  'SEGURO': {
    bg: 'rgba(0,230,118,0.05)',
    border: 'var(--green-field)',
    color: 'var(--green-field)',
    icon: CheckCircle,
    pulse: false,
  },
}

function EpaBar({ value }: { value: number }) {
  const max = 0.3
  const pct = Math.min(Math.abs(value) / max * 100, 100)
  const positive = value >= 0

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
        color: 'var(--text-muted)',
        marginBottom: '4px',
      }}>
        <span>EPA/Play (últimos jogos)</span>
        <span style={{ color: positive ? 'var(--green-field)' : 'var(--red-alert)', fontWeight: 700 }}>
          {value > 0 ? '+' : ''}{value.toFixed(3)}
        </span>
      </div>
      <div style={{
        height: '6px',
        background: 'var(--bg-line)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: positive ? 'var(--green-field)' : 'var(--red-alert)',
          borderRadius: '3px',
          left: positive ? '50%' : `calc(50% - ${pct}%)`,
          maxWidth: '50%',
          transition: 'width 0.5s ease',
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: '1px',
          height: '100%',
          background: 'var(--text-muted)',
        }} />
      </div>
    </div>
  )
}

export default function HotSeat({ team, onTeamChange }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['hot-seat', team],
    queryFn: () => nflApi.getHotSeat(team),
    enabled: !!team,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Team Selector */}
      {onTeamChange && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {NFL_TEAMS.map(t => (
            <button
              key={t}
              onClick={() => onTeamChange(t)}
              style={{
                padding: '4px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: '2px',
                border: `1px solid ${t === team ? 'var(--green-field)' : 'var(--border)'}`,
                background: t === team ? 'var(--green-glow)' : 'transparent',
                color: t === team ? 'var(--green-field)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Card de Status */}
      {isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <span className="loading-dot" />
          <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Analisando {team}...
          </span>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--red-alert)', color: 'var(--red-alert)', textAlign: 'center' }}>
          Erro ao carregar dados. Verifique se a API está rodando.
        </div>
      )}

      {data && (() => {
        const config = severityConfig[data.severity] || severityConfig['SEGURO']
        const Icon = config.icon
        const TrendIcon = data.trend === 'melhorando' ? TrendingUp : data.trend === 'piorando' ? TrendingDown : Minus

        return (
          <div style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow no canto (apenas CRÍTICO) */}
            {data.is_critical && (
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(255,23,68,0.2) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon
                  size={20}
                  color={config.color}
                  style={config.pulse ? { animation: 'pulse 1s infinite' } : undefined}
                />
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    letterSpacing: '0.05em',
                    color: config.color,
                    textTransform: 'uppercase',
                  }}>
                    {data.quarterback}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {data.team} · {data.games_analyzed} jogos analisados
                  </div>
                </div>
              </div>
              <span className={`badge ${data.is_critical ? 'badge-red' : data.severity === 'SEGURO' ? 'badge-green' : 'badge-amber'}`}>
                {data.severity}
              </span>
            </div>

            {/* EPA Bar */}
            <EpaBar value={data.recent_epa} />

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '16px',
            }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  CPOE
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  color: data.recent_cpoe >= 0 ? 'var(--green-field)' : 'var(--red-alert)',
                }}>
                  {data.recent_cpoe > 0 ? '+' : ''}{data.recent_cpoe.toFixed(1)}%
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  TENDÊNCIA
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendIcon
                    size={18}
                    color={data.trend === 'melhorando' ? 'var(--green-field)' : data.trend === 'piorando' ? 'var(--red-alert)' : 'var(--text-muted)'}
                  />
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    color: data.trend === 'melhorando' ? 'var(--green-field)' : data.trend === 'piorando' ? 'var(--red-alert)' : 'var(--text-muted)',
                  }}>
                    {data.trend}
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <p style={{
              marginTop: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              borderTop: `1px dashed ${config.border}`,
              paddingTop: '12px',
            }}>
              {data.message}
            </p>
          </div>
        )
      })()}
    </div>
  )
}
