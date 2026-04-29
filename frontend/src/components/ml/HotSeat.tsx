import { useQuery } from '@tanstack/react-query'
import { nflApi, HotSeatResult } from '../../api/nflApi'
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import TeamChip from '../team/TeamChip'
import { useTeam, useTeamsInfo } from '../../hooks/useTeamInfo'
import Skeleton from '../ui/Skeleton'
import ErrorState from '../ui/ErrorState'
import Abbr from '../ui/Abbr'

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
    bg: 'var(--red-glow)',
    border: 'var(--red-alert)',
    color: 'var(--red-alert)',
    icon: AlertTriangle,
    pulse: true,
  },
  'ALERTA': {
    bg: 'var(--amber-glow)',
    border: 'var(--amber-warn)',
    color: 'var(--amber-warn)',
    icon: AlertTriangle,
    pulse: false,
  },
  'ATENÇÃO': {
    bg: 'var(--amber-glow)',
    border: 'var(--amber-warn)',
    color: 'var(--amber-warn)',
    icon: Minus,
    pulse: false,
  },
  'SEGURO': {
    bg: 'var(--green-glow)',
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
        <span>Eficiência por jogada (últimos jogos)</span>
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
  const hotSeatQuery = useQuery({
    queryKey: ['hot-seat', team],
    queryFn: () => nflApi.getHotSeat(team),
    enabled: !!team,
  })
  const data = hotSeatQuery.data
  const isLoading = hotSeatQuery.isLoading
  const error = hotSeatQuery.error

  // Garante que metadata dos times esteja disponível pra TeamChip e accent visual
  useTeamsInfo()
  const teamInfo = useTeam(team)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Team Selector */}
      {onTeamChange && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {NFL_TEAMS.map(t => (
            <TeamChip
              key={t}
              abbr={t}
              active={t === team}
              onClick={() => onTeamChange(t)}
            />
          ))}
        </div>
      )}

      {/* Card de Status */}
      {isLoading && (
        <div>
          <Skeleton variant="card" height={140} />
        </div>
      )}

      {error && <ErrorState onRetry={() => hotSeatQuery.refetch()} />}

      {data && (() => {
        const config = severityConfig[data.severity] || severityConfig['SEGURO']
        const Icon = config.icon
        const TrendIcon = data.trend === 'melhorando' ? TrendingUp : data.trend === 'piorando' ? TrendingDown : Minus

        return (
          <div style={{
            background: config.bg,
            border: `1px solid ${config.border}`,
            borderLeft: teamInfo ? `4px solid ${teamInfo.color}` : `1px solid ${config.border}`,
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
                background: 'radial-gradient(circle, rgba(211,47,47,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {teamInfo ? (
                  <img
                    src={teamInfo.logo}
                    alt={teamInfo.abbr}
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'contain',
                      filter: `drop-shadow(0 0 8px ${teamInfo.color}80)`,
                      flexShrink: 0,
                    }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <Icon
                    size={20}
                    color={config.color}
                    style={config.pulse ? { animation: 'pulse 1s infinite' } : undefined}
                  />
                )}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    letterSpacing: '0.05em',
                    color: config.color,
                    textTransform: 'uppercase',
                    lineHeight: 1.1,
                  }}>
                    <Icon
                      size={18}
                      color={config.color}
                      style={config.pulse ? { animation: 'pulse 1s infinite' } : undefined}
                    />
                    {data.quarterback}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {teamInfo ? `${teamInfo.city} ${teamInfo.nick}` : data.team} · {data.games_analyzed} jogos analisados
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
              <div style={{ background: 'var(--bg-field)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <Abbr term="CPOE">CPOE</Abbr>
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
              <div style={{ background: 'var(--bg-field)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Como tá indo
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
