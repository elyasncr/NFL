import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Swords, Shield } from 'lucide-react'
import { nflApi } from '../../api/nflApi'
import type { TeamFormationItem, CoverageItem } from '../../api/nflApi'
import TeamChip from '../team/TeamChip'
import Skeleton from '../ui/Skeleton'
import ErrorState from '../ui/ErrorState'
import EmptyState from '../ui/EmptyState'

const NFL_TEAMS = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS']
const SEASONS = [2025, 2024, 2023, 2022]

type Side = 'offense' | 'defense'

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
  color: 'var(--text-muted)', letterSpacing: '0.1em',
}

function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ background: 'var(--bg-field)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
      <div style={{ ...labelStyle, fontSize: '0.6rem', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{value}</div>
      {hint && <div style={{ ...labelStyle, fontSize: '0.58rem', marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

export default function FormationExplorer() {
  const [team, setTeam] = useState('')
  const [season, setSeason] = useState(2025)
  const [side, setSide] = useState<Side>('offense')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['team-formations', team, season],
    queryFn: () => nflApi.getTeamFormations(team || undefined, season),
    retry: false,
  })

  const items: Array<TeamFormationItem | CoverageItem> =
    side === 'offense' ? (data?.offense.formations ?? []) : (data?.defense.coverages.items ?? [])

  // seleção: a clicada (se ainda existir) ou a 1ª com diagrama
  const active = items.find(i => i.tag === selectedTag && i.has_diagram)
    ?? items.find(i => i.has_diagram)

  const { data: diagram, isLoading: loadingDiagram } = useQuery({
    queryKey: ['team-formation-diagram', side, active?.tag, team],
    queryFn: () => nflApi.getTeamFormationDiagram(side, active!.tag, team || undefined),
    enabled: !!active,
  })

  const pickTeam = (t: string) => { setTeam(t); setSelectedTag(null) }
  const pickSeason = (s: number) => { setSeason(s); setSelectedTag(null) }
  const pickSide = (s: Side) => { setSide(s); setSelectedTag(null) }

  const personnel = data?.defense.personnel
  const insight = side === 'offense' ? data?.offense.insight : data?.defense.coverages.insight

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Time + temporada */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={labelStyle}>TIME:</span>
        <button onClick={() => pickTeam('')}
          className={`btn ${team === '' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '4px 10px', fontSize: '0.65rem' }}>
          LIGA TODA
        </button>
        {NFL_TEAMS.map(t => (
          <TeamChip key={t} abbr={t} active={team === t} onClick={() => pickTeam(t)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={labelStyle}>TEMPORADA:</span>
        {SEASONS.map(s => (
          <button key={s} onClick={() => pickSeason(s)}
            className={`btn ${season === s ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: '0.65rem' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Ataque | Defesa */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => pickSide('offense')}
          className={`btn ${side === 'offense' ? 'btn-primary' : 'btn-ghost'}`}>
          <Swords size={13} /> Ataque
        </button>
        <button onClick={() => pickSide('defense')}
          className={`btn ${side === 'defense' ? 'btn-primary' : 'btn-ghost'}`}>
          <Shield size={13} /> Defesa
        </button>
      </div>

      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          <Skeleton variant="card" height={420} />
          <Skeleton variant="card" height={420} />
        </div>
      )}

      {isError && (
        <ErrorState
          message="Sem dados pra esse filtro."
          details="Time pode não ter jogadas registradas nessa temporada."
          onRetry={() => refetch()}
        />
      )}

      {data && items.length === 0 && (
        <EmptyState
          message="Sem jogadas com tag nesse filtro."
          hint="Tenta outra temporada ou volta pra liga toda."
          action={{ label: 'Liga Toda', onClick: () => pickTeam('') }}
        />
      )}

      {data && items.length > 0 && (
        <>
          {/* Chips de formação/cobertura com % de uso */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {items.map(item => (
              <button key={item.tag}
                onClick={() => item.has_diagram && setSelectedTag(item.tag)}
                disabled={!item.has_diagram}
                title={item.has_diagram ? undefined : 'Sem diagrama pra essa categoria'}
                className={`btn ${active?.tag === item.tag ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', opacity: item.has_diagram ? 1 : 0.45 }}>
                {item.label}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', marginLeft: '6px', opacity: 0.75 }}>
                  {item.usage_pct}%
                </span>
              </button>
            ))}
          </div>

          {/* Diagrama + stats */}
          {active && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', alignItems: 'start' }}>
              <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '300px' }}>
                {loadingDiagram && (
                  <div style={{ textAlign: 'center', padding: '120px 0', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span className="loading-dot" /> Gerando diagrama...
                  </div>
                )}
                {!loadingDiagram && diagram && (
                  <img src={`data:${diagram.mime_type};base64,${diagram.image_base64}`}
                    alt={diagram.formation} style={{ width: '100%', display: 'block' }} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="card">
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {active.label}
                  </h2>
                  {active.small_sample && (
                    <div style={{ ...labelStyle, color: 'var(--red-alert)', marginBottom: '8px' }}>
                      ⚠ amostra pequena ({active.plays} jogadas)
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                    <StatBox label="Uso" value={`${active.usage_pct}%`} />
                    <StatBox label="Jogadas" value={String(active.plays)} />
                    {side === 'offense' ? (
                      <>
                        <StatBox label="EPA / jogada" value={(active as TeamFormationItem).epa_mean.toFixed(3)} />
                        <StatBox label="Success rate" value={`${(active as TeamFormationItem).success_rate}%`} />
                      </>
                    ) : (
                      <>
                        <StatBox label="EPA permitido" value={(active as CoverageItem).epa_allowed.toFixed(3)} hint="menor = melhor" />
                        <StatBox label="Success permitido" value={`${(active as CoverageItem).success_rate_allowed}%`} hint="menor = melhor" />
                      </>
                    )}
                  </div>
                  {diagram?.description && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginTop: '14px' }}>
                      {diagram.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personnel defensivo */}
          {side === 'defense' && personnel && personnel.snaps > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <StatBox label="Nickel (5 DB)" value={`${personnel.nickel_pct}%`} />
              <StatBox label="Dime (6+ DB)" value={`${personnel.dime_pct}%`} />
              <StatBox label="Base (4 DB)" value={`${personnel.base_pct}%`} />
              <StatBox label="Na caixa (média)" value={personnel.avg_box != null ? String(personnel.avg_box) : '—'} />
              <StatBox label="Taxa de blitz" value={personnel.blitz_rate != null ? `${personnel.blitz_rate}%` : '—'} hint="5+ pass rushers" />
            </div>
          )}

          {/* Insight + rodapé de transparência */}
          <div className="card" style={{ borderColor: 'var(--border-active)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              💡 {insight}
            </p>
            <p style={{ ...labelStyle, marginTop: '8px' }}>
              {side === 'offense'
                ? `${data.offense.tagged_plays.toLocaleString()} de ${data.offense.total_plays.toLocaleString()} jogadas têm tag de formação`
                : `coberturas mapeadas em ${data.defense.coverages.tagged_plays.toLocaleString()} jogadas de passe`}
              {' · '}{data.team} · {data.season}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
