import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts'
import { nflApi, MatchupResult } from '../../api/nflApi'
import { Swords, Info } from 'lucide-react'
import TeamHero from '../team/TeamHero'
import { useTeam, useTeamsInfo } from '../../hooks/useTeamInfo'
import { pickAwayColor } from '../../utils/teamColors'
import Skeleton from '../ui/Skeleton'
import ErrorState from '../ui/ErrorState'
import Abbr from '../ui/Abbr'
import MatchupFormationDuel from './MatchupFormationDuel'

const NFL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

const FALLBACK_HOME = '#ff4d6d'
const FALLBACK_AWAY = '#4d94ff'

function WinProbBar({ homeTeam, awayTeam, homeProb, awayProb, homeColor, awayColor }: {
  homeTeam: string; awayTeam: string; homeProb: number; awayProb: number
  homeColor: string; awayColor: string
}) {
  const homePct = Math.round(homeProb * 100)
  const awayPct = Math.round(awayProb * 100)

  const homeFavored = homeProb >= awayProb
  const winner = homeFavored ? homeTeam : awayTeam
  const winnerColor = homeFavored ? homeColor : awayColor
  const winnerPct = homeFavored ? homePct : awayPct
  const margin = Math.abs(homePct - awayPct)

  // Confiança qualitativa baseada na margem
  const confidence =
    margin >= 40 ? 'Vitória bem provável' :
    margin >= 20 ? 'Favorito claro' :
    margin >= 10 ? 'Leve vantagem' :
                   'Jogo equilibrado'

  return (
    <div style={{
      padding: '20px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header explicativo */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Quem vence · Previsão da IA
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.15rem',
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
        }}>
          A IA dá favoritismo pra{' '}
          <span style={{ color: winnerColor, fontWeight: 800 }}>{winner}</span>
          {' '}com{' '}
          <span style={{ color: winnerColor, fontWeight: 800 }}>{winnerPct}%</span>
          {' '}de chance
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          marginTop: '4px',
        }}>
          {confidence} · margem de {margin} pontos percentuais
        </div>
      </div>

      {/* Barra horizontal */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.95rem',
        letterSpacing: '0.06em',
        marginBottom: '6px',
      }}>
        <span style={{ color: homeColor }}>{homeTeam} {homePct}%</span>
        <span style={{ color: awayColor }}>{awayPct}% {awayTeam}</span>
      </div>
      <div style={{
        height: '10px',
        borderRadius: '5px',
        overflow: 'hidden',
        display: 'flex',
        background: 'var(--bg-line)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: `${homePct}%`,
          background: `linear-gradient(90deg, ${homeColor}AA, ${homeColor})`,
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
        <div style={{
          width: `${awayPct}%`,
          background: `linear-gradient(90deg, ${awayColor}, ${awayColor}AA)`,
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>
    </div>
  )
}

function DuelCard({ attackTeam, attackEpa, attackColor, defenseTeam, defenseEpa, defenseColor }: {
  attackTeam: string; attackEpa: number; attackColor: string
  defenseTeam: string; defenseEpa: number; defenseColor: string
}) {
  // Off EPA: positivo = ataque gera EPA acima da média.
  // Def EPA: positivo = defesa permite EPA acima da média (ruim).
  // Net = ataque - defesa: positivo → ataque produz mais do que defesa permite.
  const net = attackEpa - defenseEpa
  const attackWins = net > 0
  const winnerColor = attackWins ? attackColor : defenseColor
  const winnerLabel = attackWins
    ? `${attackTeam} manda no duelo`
    : `${defenseTeam} segura na boa`
  const winnerExplain = attackWins
    ? `${attackTeam} costuma criar mais EPA do que ${defenseTeam} permite. Ataque deve explorar.`
    : `Ataque do ${attackTeam} fica abaixo do que ${defenseTeam} costuma permitir. Defesa segura sem suar.`

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${winnerColor}`,
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.62rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Ataque {attackTeam} <span style={{ color: 'var(--text-muted)' }}>vs</span> Defesa {defenseTeam}
      </div>

      {/* Lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: attackColor,
            letterSpacing: '0.04em',
          }}>
            {attackEpa >= 0 ? '+' : ''}{attackEpa.toFixed(3)}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '2px',
          }}>
            {attackTeam} <Abbr term="Off EPA">OFF EPA</Abbr>
          </div>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          fontWeight: 700,
        }}>
          VS
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.5rem',
            color: defenseColor,
            letterSpacing: '0.04em',
          }}>
            {defenseEpa >= 0 ? '+' : ''}{defenseEpa.toFixed(3)}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '2px',
          }}>
            {defenseTeam} <Abbr term="Def EPA">DEF EPA</Abbr>
          </div>
        </div>
      </div>

      {/* Veredicto */}
      <div style={{
        padding: '10px 12px',
        background: `${winnerColor}15`,
        border: `1px solid ${winnerColor}66`,
        borderRadius: 'var(--radius)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.85rem',
          color: winnerColor,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '2px',
        }}>
          {attackWins ? '▶' : '◀'} {winnerLabel} ({net >= 0 ? '+' : ''}{net.toFixed(3)})
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
        }}>
          {winnerExplain}
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, home, away, higherIsBetter = true, homeColor, awayColor }: {
  label: string; home: number; away: number; higherIsBetter?: boolean
  homeColor: string; awayColor: string
}) {
  const homeWins = higherIsBetter ? home > away : home < away
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '8px',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: homeWins ? 700 : 400,
        fontSize: '0.95rem',
        color: homeWins ? homeColor : 'var(--text-secondary)',
        textAlign: 'right',
      }}>
        {home.toFixed(3)}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.62rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        padding: '0 8px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: !homeWins ? 700 : 400,
        fontSize: '0.95rem',
        color: !homeWins ? awayColor : 'var(--text-secondary)',
        textAlign: 'left',
      }}>
        {away.toFixed(3)}
      </div>
    </div>
  )
}

export default function MatchupRadar() {
  // Default: Super Bowl LX (temporada 2025) — NE vs SEA, 2026-02-08
  const [homeTeam, setHomeTeam] = useState('NE')
  const [awayTeam, setAwayTeam] = useState('SEA')

  // Garante que metadata dos times esteja disponível para TeamHero
  useTeamsInfo()
  const homeInfo = useTeam(homeTeam)
  const awayInfo = useTeam(awayTeam)
  const homeColor = homeInfo?.color ?? FALLBACK_HOME
  // Se o away tem cor parecida com a do home, usa color2 do away
  const awayColor = awayInfo
    ? pickAwayColor(homeColor, awayInfo, FALLBACK_AWAY)
    : FALLBACK_AWAY

  const matchupQuery = useQuery({
    queryKey: ['matchup', homeTeam, awayTeam],
    queryFn: () => nflApi.getMatchup(homeTeam, awayTeam),
    enabled: homeTeam !== awayTeam,
  })
  const data = matchupQuery.data
  const isLoading = matchupQuery.isLoading
  const error = matchupQuery.error

  // Converte os dados da API para o formato do Recharts
  const radarData = data?.radar
    ? data.radar.labels.map((label: string, i: number) => ({
        subject: label,
        [data.home_team]: data.radar.datasets[0].data[i],
        [data.away_team]: data.radar.datasets[1].data[i],
      }))
    : []

  const winProbCenter = data
    ? `${Math.round(data.home_win_probability * 100)}% / ${Math.round(data.away_win_probability * 100)}%`
    : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Team Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            Time da Casa
          </label>
          <select
            value={homeTeam}
            onChange={e => setHomeTeam(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-card)',
              border: `1px solid ${homeColor}66`,
              borderLeft: `3px solid ${homeColor}`,
              borderRadius: 'var(--radius)',
              color: homeColor,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Swords size={24} color="var(--text-muted)" style={{ marginTop: '20px' }} />
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}>
            Visitante
          </label>
          <select
            value={awayTeam}
            onChange={e => setAwayTeam(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-card)',
              border: `1px solid ${awayColor}66`,
              borderLeft: `3px solid ${awayColor}`,
              borderRadius: 'var(--radius)',
              color: awayColor,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Hero com logos + nomes */}
      <TeamHero
        homeAbbr={homeTeam}
        awayAbbr={awayTeam}
        homeColor={homeColor}
        awayColor={awayColor}
        centerLabel={winProbCenter ? 'WIN PROBABILITY' : undefined}
        centerText={winProbCenter}
      />

      {/* Win Probability bar */}
      {data && (
        <WinProbBar
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeProb={data.home_win_probability}
          awayProb={data.away_win_probability}
          homeColor={homeColor}
          awayColor={awayColor}
        />
      )}

      {/* Duelos: Ataque vs Defesa */}
      {data && (
        <div>
          <div style={{ marginBottom: '10px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Olha o duelo · Ataque vs Defesa
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-secondary)',
              marginTop: '2px',
            }}>
              Lembrando: ataque positivo = bom; defesa negativa = boa.
            </div>
          </div>
          <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <DuelCard
              attackTeam={homeTeam}
              attackEpa={data.home_stats.off_epa ?? 0}
              attackColor={homeColor}
              defenseTeam={awayTeam}
              defenseEpa={data.away_stats.def_epa ?? 0}
              defenseColor={awayColor}
            />
            <DuelCard
              attackTeam={awayTeam}
              attackEpa={data.away_stats.off_epa ?? 0}
              attackColor={awayColor}
              defenseTeam={homeTeam}
              defenseEpa={data.home_stats.def_epa ?? 0}
              defenseColor={homeColor}
            />
          </div>
        </div>
      )}

      <MatchupFormationDuel homeTeam={homeTeam} awayTeam={awayTeam} />

      {/* Radar Chart */}
      {isLoading && (
        <div>
          <Skeleton variant="card" height={120} />
          <Skeleton variant="line" width="80%" style={{ marginTop: '16px' }} />
          <Skeleton variant="line" count={3} style={{ marginTop: '8px' }} />
        </div>
      )}

      {error && <ErrorState onRetry={() => matchupQuery.refetch()} />}

      {data && radarData.length > 0 && (
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{
                  fill: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                }}
              />
              <PolarRadiusAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
              <Radar
                name={homeTeam}
                dataKey={homeTeam}
                stroke={homeColor}
                fill={homeColor}
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Radar
                name={awayTeam}
                dataKey={awayTeam}
                stroke={awayColor}
                fill={awayColor}
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Legend
                wrapperStyle={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats Comparison */}
      {data && (
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            Os números brutos
          </div>
          <StatRow
            label="Off EPA"
            home={data.home_stats.off_epa ?? 0}
            away={data.away_stats.off_epa ?? 0}
            homeColor={homeColor}
            awayColor={awayColor}
          />
          <StatRow
            label="Def EPA"
            home={data.home_stats.def_epa ?? 0}
            away={data.away_stats.def_epa ?? 0}
            higherIsBetter={false}
            homeColor={homeColor}
            awayColor={awayColor}
          />
          <StatRow
            label="Pass EPA"
            home={data.home_stats.off_pass_epa ?? 0}
            away={data.away_stats.off_pass_epa ?? 0}
            homeColor={homeColor}
            awayColor={awayColor}
          />
          <StatRow
            label="Rush EPA"
            home={data.home_stats.off_rush_epa ?? 0}
            away={data.away_stats.off_rush_epa ?? 0}
            homeColor={homeColor}
            awayColor={awayColor}
          />
          <StatRow
            label="Success Rate"
            home={data.home_stats.off_success_rate ?? 0}
            away={data.away_stats.off_success_rate ?? 0}
            homeColor={homeColor}
            awayColor={awayColor}
          />

          {/* Insight */}
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'var(--green-glow)',
            border: '1px solid var(--border-active)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}>
            <Info size={14} color="var(--green-field)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              margin: 0,
            }}>
              {data.insight}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
