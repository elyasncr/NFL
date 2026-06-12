import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { nflApi } from '../api/nflApi'
import { Upload, Eye, BarChart2 } from 'lucide-react'
import TeamChip from '../components/team/TeamChip'
import Skeleton from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import FormationExplorer from '../components/vision/FormationExplorer'

const NFL_TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS']

type Tab = 'data' | 'diagrams' | 'upload'

export default function Vision() {
  const [activeTab, setActiveTab] = useState<Tab>('data')
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [uploadResult, setUploadResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: formationsData, isLoading: loadingData } = useQuery({
    queryKey: ['formations-data', selectedTeam],
    queryFn: () => nflApi.getFormationsData(selectedTeam || undefined),
    enabled: activeTab === 'data',
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => nflApi.analyzeImage(file),
    onSuccess: (data) => setUploadResult(data),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'data', label: 'EPA por Formação', icon: BarChart2 },
    { id: 'diagrams', label: 'Formações por Time', icon: Eye },
    { id: 'upload', label: 'Analisar Imagem', icon: Upload },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.4rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Visão <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ Computer Vision</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Veja como cada formação se sai em campo, explore as formações e coberturas de cada time e analise imagens com Computer Vision.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`btn ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Tab: EPA por Formação */}
      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Team selector */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>FILTRAR TIME:</span>
            <button onClick={() => setSelectedTeam('')}
              className={`btn ${selectedTeam === '' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '0.65rem' }}>
              LIGA TODA
            </button>
            {NFL_TEAMS.map(t => (
              <TeamChip
                key={t}
                abbr={t}
                active={selectedTeam === t}
                onClick={() => setSelectedTeam(t)}
              />
            ))}
          </div>

          {loadingData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Skeleton variant="card" height={300} />
              <Skeleton variant="card" height={300} />
            </div>
          )}

          {formationsData && formationsData.chart.labels.length === 0 && (
            <EmptyState
              message="Sem jogadas suficientes pra esse filtro."
              hint="Tenta outro time ou volta pra liga toda."
              action={{ label: 'Liga Toda', onClick: () => setSelectedTeam('') }}
            />
          )}

          {formationsData && formationsData.chart.labels.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* EPA Chart */}
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Quão eficiente é cada formação
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={formationsData.chart.labels.map((label, i) => ({
                    formation: label.split(' ').slice(0, 2).join(' '),
                    epa: formationsData.chart.epa[i],
                  }))} layout="vertical">
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="formation" type="category" tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }} />
                    <ReferenceLine x={0} stroke="var(--text-muted)" strokeWidth={1} />
                    <Bar dataKey="epa" radius={[0, 3, 3, 0]}>
                      {formationsData.chart.epa.map((v, i) => (
                        <Cell key={i} fill={v >= 0 ? 'var(--green-field)' : 'var(--red-alert)'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Usage Chart */}
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                  Quanto cada formação aparece nas jogadas
                </h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={formationsData.chart.labels.map((label, i) => ({
                    formation: label.split(' ').slice(0, 2).join(' '),
                    usage: formationsData.chart.usage[i],
                  }))} layout="vertical">
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="formation" type="category" tick={{ fill: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 9 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }} formatter={(v: any) => [`${v}%`, 'Uso']} />
                    <Bar dataKey="usage" fill="var(--blue-data)" fillOpacity={0.7} radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Insight */}
              <div className="card" style={{ gridColumn: '1 / -1', borderColor: 'var(--border-active)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  💡 {formationsData.insight}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  {formationsData.total_plays.toLocaleString()} jogadas analisadas · {formationsData.team}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Formações por Time */}
      {activeTab === 'diagrams' && <FormationExplorer />}

      {/* Tab: Upload */}
      {activeTab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '60px 40px',
              borderStyle: 'dashed',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadMutation.mutate(f) }}
          >
            <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Arraste ou clique para enviar
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              PNG ou JPEG · Máx 5MB · Funciona melhor com diagramas de jogadas
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>

          {uploadMutation.isPending && (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <span className="loading-dot" />
              <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Analisando imagem com OpenCV...
              </span>
            </div>
          )}

          {uploadResult && (
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Resultado da Análise
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Jogadores detectados', value: uploadResult.circles_detected },
                  { label: 'Formação estimada', value: uploadResult.formation_estimate },
                  { label: 'Confiança', value: uploadResult.confidence },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--bg-field)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                ℹ️ {uploadResult.note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
