import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { nflApi, TeamStats } from '../api/nflApi'
import HotSeat from '../components/ml/HotSeat'
import { TrendingUp, Shield, Target, Activity } from 'lucide-react'

function MetricCard({ label, value, unit = '', icon: Icon, positive }: {
  label: string; value: string; unit?: string; icon: any; positive?: boolean
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <Icon size={14} color="var(--text-muted)" />
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: '2.2rem',
        letterSpacing: '0.02em',
        color: positive === undefined
          ? 'var(--text-primary)'
          : positive
            ? 'var(--green-field)'
            : 'var(--red-alert)',
      }}>
        {value}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
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
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: value >= 0 ? 'var(--green-field)' : 'var(--red-alert)', fontWeight: 700 }}>
        EPA: {value >= 0 ? '+' : ''}{value.toFixed(4)}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [hotSeatTeam, setHotSeatTeam] = useState('KC')
  const [sortBy, setSortBy] = useState<'off_epa' | 'def_epa'>('off_epa')

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: nflApi.getAllTeams,
  })

  const { data: modelInfo } = useQuery({
    queryKey: ['model-info'],
    queryFn: nflApi.getModelInfo,
  })

  const sortedTeams = teams
    ? [...teams].sort((a, b) =>
        sortBy === 'def_epa'
          ? a.def_epa - b.def_epa  // menor def_epa = melhor defesa
          : b.off_epa - a.off_epa  // maior off_epa = melhor ataque
      )
    : []

  const bestOffense = teams?.reduce((a, b) => a.off_epa > b.off_epa ? a : b)
  const bestDefense = teams?.reduce((a, b) => a.def_epa < b.def_epa ? a : b)
  const leagueAvgEpa = teams ? teams.reduce((s, t) => s + t.off_epa, 0) / teams.length : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '2.4rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          Dashboard <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ Season {2024}</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Análise baseada em EPA (Expected Points Added) · Dados nfl_data_py
          {modelInfo?.accuracy && (
            <span style={{ marginLeft: '16px', color: 'var(--green-field)' }}>
              · Modelo: {(modelInfo.accuracy * 100).toFixed(1)}% acurácia
            </span>
          )}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <MetricCard
          label="Melhor Ataque (Off EPA)"
          value={bestOffense ? `${bestOffense.team}` : '—'}
          icon={TrendingUp}
          positive
        />
        <MetricCard
          label="Melhor Defesa (Def EPA)"
          value={bestDefense ? `${bestDefense.team}` : '—'}
          icon={Shield}
          positive
        />
        <MetricCard
          label="Média da Liga"
          value={leagueAvgEpa.toFixed(4)}
          unit=" EPA"
          icon={Activity}
          positive={leagueAvgEpa >= 0}
        />
        <MetricCard
          label="Times Analisados"
          value={teams?.length.toString() ?? '—'}
          icon={Target}
        />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
        {/* EPA Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Ranking de Eficiência
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

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
              <span className="loading-dot" /> Carregando dados da NFL...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sortedTeams} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis
                  type="number"
                  domain={['auto', 'auto']}
                  tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="team"
                  type="category"
                  tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1} />
                <Bar dataKey={sortBy} radius={[0, 2, 2, 0]}>
                  {sortedTeams.map((entry) => {
                    const val = sortBy === 'def_epa' ? entry.def_epa : entry.off_epa
                    const good = sortBy === 'def_epa' ? val < 0 : val > 0
                    return (
                      <Cell
                        key={entry.team}
                        fill={good ? 'var(--green-field)' : 'var(--red-alert)'}
                        fillOpacity={0.8}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hot Seat */}
        <div className="card">
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            🚨 Berlinda do QB
          </h2>
          <HotSeat team={hotSeatTeam} onTeamChange={setHotSeatTeam} />
        </div>
      </div>

      {/* Model Info */}
      {modelInfo?.accuracy && (
        <div className="card" style={{ borderColor: 'rgba(68,138,255,0.2)' }}>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Módulo 1 — XGBoost Win Predictor
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--blue-data)', marginTop: '4px' }}>
                Modelo Treinado ✓
              </div>
            </div>
            {[
              { label: 'Acurácia', value: `${(modelInfo.accuracy * 100).toFixed(1)}%` },
              { label: 'ROC-AUC', value: modelInfo.roc_auc?.toFixed(4) ?? '—' },
              { label: 'CV ROC-AUC', value: `${modelInfo.cv_roc_auc_mean?.toFixed(4)} ± ${modelInfo.cv_roc_auc_std?.toFixed(4)}` },
              { label: 'Amostras', value: modelInfo.training_samples?.toLocaleString() ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
