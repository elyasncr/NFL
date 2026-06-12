import { useQuery } from '@tanstack/react-query'
import { nflApi } from '../../api/nflApi'
import type { MatchupDiagram } from '../../api/nflApi'
import { useTeam } from '../../hooks/useTeamInfo'
import Skeleton from '../ui/Skeleton'

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
  color: 'var(--text-muted)', letterSpacing: '0.1em',
}

function DuelCard({ data, offTeam, defTeam }: { data: MatchupDiagram; offTeam: string; defTeam: string }) {
  const offInfo = useTeam(offTeam)
  const defInfo = useTeam(defTeam)
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <span style={{ color: offInfo?.color }}>Ataque {offTeam}</span>
        <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>×</span>
        <span style={{ color: defInfo?.color }}>Defesa {defTeam}</span>
      </div>
      <img
        src={`data:${data.mime_type};base64,${data.image_base64}`}
        alt={`${data.formation.label} (${offTeam}) contra ${data.coverage.label} (${defTeam})`}
        style={{ width: '100%', display: 'block' }}
      />
      <div style={{ padding: '10px 16px 14px' }}>
        <p style={{ ...mono, margin: 0, lineHeight: 1.7 }}>
          {data.formation.label}: {data.formation.usage_pct}% das jogadas do {offTeam}
          {' · '}
          {data.coverage.label}: {data.coverage.usage_pct}% dos passes defendidos do {defTeam}
        </p>
        <p style={{ ...mono, margin: '4px 0 0', lineHeight: 1.7 }}>
          EPA do ataque {data.formation.epa_mean >= 0 ? '+' : ''}{data.formation.epa_mean.toFixed(3)}
          {' × '}
          EPA permitido {data.coverage.epa_allowed >= 0 ? '+' : ''}{data.coverage.epa_allowed.toFixed(3)} (menor = melhor)
        </p>
      </div>
    </div>
  )
}

export default function MatchupFormationDuel({ homeTeam, awayTeam }: { homeTeam: string; awayTeam: string }) {
  const enabled = !!homeTeam && !!awayTeam && homeTeam !== awayTeam

  const homeAttack = useQuery({
    queryKey: ['matchup-diagram', homeTeam, awayTeam],
    queryFn: () => nflApi.getMatchupDiagram(homeTeam, awayTeam),
    enabled, retry: false,
  })
  const awayAttack = useQuery({
    queryKey: ['matchup-diagram', awayTeam, homeTeam],
    queryFn: () => nflApi.getMatchupDiagram(awayTeam, homeTeam),
    enabled, retry: false,
  })

  if (!enabled) return null
  const loading = homeAttack.isLoading || awayAttack.isLoading
  // Seção secundária: sem dados em ambas as direções → some sem poluir a página
  if (!loading && !homeAttack.data && !awayAttack.data) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <div style={{ ...mono, textTransform: 'uppercase' }}>Simulação · Formações mais usadas</div>
        <div style={{ ...mono, fontSize: '0.62rem', marginTop: '2px' }}>
          Alinhamentos típicos da temporada — não é predição de jogada.
        </div>
      </div>
      <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {loading ? (
          <>
            <Skeleton variant="card" height={340} />
            <Skeleton variant="card" height={340} />
          </>
        ) : (
          <>
            {homeAttack.data && <DuelCard data={homeAttack.data} offTeam={homeTeam} defTeam={awayTeam} />}
            {awayAttack.data && <DuelCard data={awayAttack.data} offTeam={awayTeam} defTeam={homeTeam} />}
          </>
        )}
      </div>
    </div>
  )
}
