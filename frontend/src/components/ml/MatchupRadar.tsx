import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts'
import { nflApi, MatchupResult } from '../../api/nflApi'
import { Swords, Info } from 'lucide-react'

const NFL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

function WinProbBar({ homeTeam, awayTeam, homeProb, awayProb }: {
  homeTeam: string; awayTeam: string; homeProb: number; awayProb: number
}) {
  const homePct = Math.round(homeProb * 100)
  const awayPct = Math.round(awayProb * 100)

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1rem',
        letterSpacing: '0.06em',
        marginBottom: '8px',
      }}>
        <span style={{ color: '#ff4d6d' }}>{homeTeam} {homePct}%</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
          WIN PROBABILITY
        </span>
        <span style={{ color: '#4d94ff' }}>{awayPct}% {awayTeam}</span>
      </div>
      <div style={{
        height: '10px',
        borderRadius: '5px',
        overflow: 'hidden',
        display: 'flex',
        background: 'var(--bg-line)',
      }}>
        <div style={{
          width: `${homePct}%`,
          background: 'linear-gradient(90deg, #c62828, #ff4d6d)',
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
        <div style={{
          width: `${awayPct}%`,
          background: 'linear-gradient(90deg, #4d94ff, #1565c0)',
          transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>
    </div>
  )
}

function StatRow({ label, home, away, higherIsBetter = true }: {
  label: string; home: number; away: number; higherIsBetter?: boolean
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
        color: homeWins ? '#ff4d6d' : 'var(--text-secondary)',
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
        color: !homeWins ? '#4d94ff' : 'var(--text-secondary)',
        textAlign: 'left',
      }}>
        {away.toFixed(3)}
      </div>
    </div>
  )
}

export default function MatchupRadar() {
  const [homeTeam, setHomeTeam] = useState('KC')
  const [awayTeam, setAwayTeam] = useState('SF')

  const { data, isLoading, error } = useQuery({
    queryKey: ['matchup', homeTeam, awayTeam],
    queryFn: () => nflApi.getMatchup(homeTeam, awayTeam),
    enabled: homeTeam !== awayTeam,
  })

  // Converte os dados da API para o formato do Recharts
  const radarData = data?.radar
    ? data.radar.labels.map((label: string, i: number) => ({
        subject: label,
        [data.home_team]: data.radar.datasets[0].data[i],
        [data.away_team]: data.radar.datasets[1].data[i],
      }))
    : []

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
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: '#ff4d6d',
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
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: '#4d94ff',
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

      {/* Win Probability */}
      {data && (
        <WinProbBar
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeProb={data.home_win_probability}
          awayProb={data.away_win_probability}
        />
      )}

      {/* Radar Chart */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <span className="loading-dot" style={{ marginRight: '10px' }} />
          Carregando análise...
        </div>
      )}

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
                stroke="#ff4d6d"
                fill="#ff4d6d"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name={awayTeam}
                dataKey={awayTeam}
                stroke="#4d94ff"
                fill="#4d94ff"
                fillOpacity={0.15}
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
            Comparativo de Stats
          </div>
          <StatRow
            label="Off EPA"
            home={data.home_stats.off_epa ?? 0}
            away={data.away_stats.off_epa ?? 0}
          />
          <StatRow
            label="Def EPA"
            home={data.home_stats.def_epa ?? 0}
            away={data.away_stats.def_epa ?? 0}
            higherIsBetter={false}
          />
          <StatRow
            label="Pass EPA"
            home={data.home_stats.off_pass_epa ?? 0}
            away={data.away_stats.off_pass_epa ?? 0}
          />
          <StatRow
            label="Rush EPA"
            home={data.home_stats.off_rush_epa ?? 0}
            away={data.away_stats.off_rush_epa ?? 0}
          />
          <StatRow
            label="Success Rate"
            home={data.home_stats.off_success_rate ?? 0}
            away={data.away_stats.off_success_rate ?? 0}
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
