import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { Bot } from 'lucide-react'
import { nflApi, PlayoffGame } from '../api/nflApi'
import HotSeat from '../components/ml/HotSeat'
import { useTeamsInfo, normalizeAbbr, useTeam } from '../hooks/useTeamInfo'
import ChampionCard from '../components/team/ChampionCard'
import Skeleton from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'

const TeamYTick = ({ x, y, payload, teamsInfo, positions }: any) => {
  const team = teamsInfo?.find((t: any) => t.abbr === normalizeAbbr(payload.value))
  const pos = positions?.[payload.value]
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-92} y={4} textAnchor="end"
        fill="var(--text-muted)"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}
      >
        {pos ? `${pos}º` : ''}
      </text>
      {team && (
        <image
          href={team.logo}
          x={-72} y={-9} width={18} height={18}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      <text
        x={-2} y={4} textAnchor="end"
        fill="var(--text-secondary)"
        style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}
      >
        {payload.value}
      </text>
    </g>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const value = payload[0].value
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.72rem',
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: value >= 0 ? 'var(--green-field)' : 'var(--red-alert)', fontWeight: 700 }}>
        {value >= 0 ? '+' : ''}{value.toFixed(3)} EPA/jogada
      </div>
    </div>
  )
}

function StatPill({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ flex: '1 1 auto', minWidth: '140px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
        color: 'var(--text-muted)', letterSpacing: '0.1em',
        textTransform: 'uppercase', marginBottom: '4px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem',
        color: 'var(--text-primary)', letterSpacing: '0.02em',
      }}>
        {value}
      </div>
    </div>
  )
}

function HeadlineStrip({ championAbbr }: { championAbbr: string | null }) {
  const team = useTeam(championAbbr ?? undefined)
  if (!team) return null
  return (
    <div style={{
      background: '#0d1419',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      color: '#fff',
    }}>
      <img src={team.logo} alt={team.abbr}
           style={{
             width: '40px', height: '40px', objectFit: 'contain',
             filter: `drop-shadow(0 0 8px ${team.color}aa)`, flexShrink: 0,
           }} />
      <div style={{
        background: team.color, padding: '3px 8px', borderRadius: '2px',
        fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0,
      }}>
        🏆 SUPER BOWL LX
      </div>
      <div style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.04em' }}>
        {team.city} {team.nick} encerram a temporada como campeões.
      </div>
      <Link to="/" style={{
        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        Ler edição completa →
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const [hotSeatTeam, setHotSeatTeam] = useState('KC')
  const [sortBy, setSortBy] = useState<'off_epa' | 'def_epa'>('off_epa')

  const teamsQuery = useQuery({
    queryKey: ['teams'],
    queryFn: nflApi.getAllTeams,
  })
  const teams = teamsQuery.data

  const { data: modelInfo } = useQuery({
    queryKey: ['model-info'],
    queryFn: nflApi.getModelInfo,
  })

  const playoffsQuery = useQuery({
    queryKey: ['playoffs', 2025],
    queryFn: () => nflApi.getPlayoffs(2025),
  })
  const sbGame: PlayoffGame | undefined = playoffsQuery.data?.find(g => g.round === 'SB')
  const championAbbr = sbGame
    ? ((sbGame.home_score ?? 0) > (sbGame.away_score ?? 0) ? sbGame.home : sbGame.away)
    : null

  const { data: teamsInfo } = useTeamsInfo()

  const sortedTeams = teams
    ? [...teams].sort((a, b) =>
        sortBy === 'def_epa'
          ? a.def_epa - b.def_epa  // menor def_epa = melhor defesa
          : b.off_epa - a.off_epa  // maior off_epa = melhor ataque
      )
    : []

  const bestOffense = teams?.reduce((a, b) => a.off_epa > b.off_epa ? a : b)
  const bestDefense = teams?.reduce((a, b) => a.def_epa < b.def_epa ? a : b)
  const leagueAvgOff = teams ? teams.reduce((s, t) => s + t.off_epa, 0) / teams.length : 0
  const leagueAvgDef = teams ? teams.reduce((s, t) => s + t.def_epa, 0) / teams.length : 0

  // Mapa abbr → posição (1-based) na ordem atual
  const positions = sortedTeams.reduce((acc, t, i) => {
    acc[t.team] = i + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      <HeadlineStrip championAbbr={championAbbr} />

      {/* ── 1. Header ─────────────────────────────────────────── */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '2.4rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}>
          NFL <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ Temporada 2025-2026</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '780px',
        }}>
          Os destaques da temporada que terminou no Super Bowl LX. Quem mandou no ataque, quem segurou na defesa, e como anda o quarterback do seu time.
        </p>
      </div>

      {/* ── 2. Champions: 2 cards grandes ─────────────────────── */}
      {bestOffense && bestDefense && (
        <div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            marginBottom: '14px',
          }}>
            Os Melhores da Temporada
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <ChampionCard variant="attack"  abbr={bestOffense.team} epaValue={bestOffense.off_epa} />
            <ChampionCard variant="defense" abbr={bestDefense.team} epaValue={bestDefense.def_epa} />
          </div>
        </div>
      )}

      {/* ── 3. Stats da liga (linha compacta) ─────────────────── */}
      <div style={{
        display: 'flex', gap: '32px', flexWrap: 'wrap',
        padding: '16px 22px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <StatPill
          label="Times analisados"
          value={teams?.length.toString() ?? '—'}
        />
        <StatPill
          label="Média da liga · ataque"
          value={`${leagueAvgOff >= 0 ? '+' : ''}${leagueAvgOff.toFixed(3)}`}
          hint="EPA médio por jogada considerando todos os 32 times"
        />
        <StatPill
          label="Média da liga · defesa"
          value={`${leagueAvgDef >= 0 ? '+' : ''}${leagueAvgDef.toFixed(3)}`}
          hint="EPA permitido por jogada na média (menor = liga defensivamente mais forte)"
        />
      </div>

      {/* ── 4. Ranking + Quarterback ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>

        {/* Ranking */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.1rem', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Ranking dos 32 Times
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['off_epa', 'def_epa'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`btn ${sortBy === key ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: '0.65rem' }}
                >
                  {key === 'off_epa' ? '⚔ Ataque' : '🛡 Defesa'}
                </button>
              ))}
            </div>
          </div>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5,
          }}>
            {sortBy === 'off_epa'
              ? 'Times que mais criam pontos esperados por jogada — líder no topo, pior no fim. Cada barra usa a cor oficial do time.'
              : 'Times que mais tiram pontos esperados do adversário — líder no topo (barra negativa), pior no fim. Aqui menor é melhor.'
            }
          </p>

          {teamsQuery.isLoading ? (
            <div>
              <Skeleton variant="line" width="60%" />
              <Skeleton variant="line" count={10} style={{ marginTop: '8px' }} />
            </div>
          ) : teamsQuery.isError ? (
            <ErrorState onRetry={() => teamsQuery.refetch()} />
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={sortedTeams} layout="vertical" margin={{ left: 10, right: 24 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="team"
                  type="category"
                  tick={(props) => <TeamYTick {...props} teamsInfo={teamsInfo} positions={positions} />}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-field)' }} />
                <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1} />
                <Bar dataKey={sortBy} radius={[0, 3, 3, 0]}>
                  {sortedTeams.map((entry) => {
                    const val = sortBy === 'def_epa' ? entry.def_epa : entry.off_epa
                    const good = sortBy === 'def_epa' ? val < 0 : val > 0
                    const teamInfo = teamsInfo?.find(t => t.abbr === normalizeAbbr(entry.team))
                    const teamColor = teamInfo?.color
                    return (
                      <Cell
                        key={entry.team}
                        fill={teamColor ?? (good ? 'var(--green-field)' : 'var(--red-alert)')}
                        fillOpacity={good ? 0.9 : 0.45}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quarterback em pressão */}
        <div className="card">
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1.1rem', letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: '4px',
          }}>
            🚨 Como Anda o Quarterback
          </h2>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
            color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5,
          }}>
            O <strong style={{ color: 'var(--text-primary)' }}>quarterback (QB)</strong> é o passador, líder do ataque. Selecione um time abaixo e veja se ele está em risco de perder o lugar — combina EPA recente, precisão e tendência dos últimos jogos.
          </p>
          <HotSeat team={hotSeatTeam} onTeamChange={setHotSeatTeam} />
        </div>
      </div>

      {/* ── 5. IA discreta no rodapé ──────────────────────────── */}
      {modelInfo?.accuracy && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--blue-data)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 22px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <Bot size={28} color="var(--blue-data)" style={{ flexShrink: 0 }} />
          <div style={{ flex: '1 1 320px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
              color: 'var(--text-muted)', letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: '4px',
            }}>
              Previsão de Vitória · IA
            </div>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
              color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0,
            }}>
              A IA aprendeu com{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {modelInfo.training_samples?.toLocaleString() ?? '—'} jogos
              </strong>
              {' '}das últimas 4 temporadas e acerta o vencedor em{' '}
              <strong style={{ color: 'var(--green-field)' }}>
                {(modelInfo.accuracy * 100).toFixed(1)}%
              </strong>
              {' '}das partidas. Use a aba <strong style={{ color: 'var(--blue-data)' }}>Confronto</strong> ou faça uma pergunta rápida no <strong>💬 canto inferior direito</strong>.
            </p>
          </div>
          <details style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Métricas técnicas</summary>
            <div style={{ marginTop: '10px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: 'Acurácia', value: `${(modelInfo.accuracy * 100).toFixed(1)}%`, hint: '% de jogos com vencedor previsto correto' },
                { label: 'ROC-AUC', value: modelInfo.roc_auc?.toFixed(3) ?? '—', hint: 'Qualidade do ranking de probabilidades (1 = perfeito, 0.5 = aleatório)' },
                { label: 'CV ROC-AUC', value: `${modelInfo.cv_roc_auc_mean?.toFixed(3)} ± ${modelInfo.cv_roc_auc_std?.toFixed(3)}`, hint: 'ROC-AUC médio em validação cruzada (5-fold)' },
              ].map(({ label, value, hint }) => (
                <div key={label} title={hint}>
                  <div style={{ fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginTop: '2px' }}>{value}</div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
