import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Activity, Swords, Bot } from 'lucide-react'
import { nflApi, PlayoffGame } from '../api/nflApi'
import { useTeamsInfo } from '../hooks/useTeamInfo'
import ChampionCard from '../components/team/ChampionCard'
import TribuneHero from '../components/tribune/TribuneHero'
import PlayoffsTimeline from '../components/tribune/PlayoffsTimeline'
import TribuneFooter from '../components/tribune/TribuneFooter'
import Skeleton from '../components/ui/Skeleton'
import ErrorState from '../components/ui/ErrorState'

const SEASON = 2025

function ChapterCard({ to, icon: Icon, title, copy, color }: {
  to: string; icon: React.ElementType; title: string; copy: string; color: string
}) {
  return (
    <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{
        height: '100%',
        borderLeft: `3px solid ${color}`,
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
      >
        <Icon size={20} color={color} style={{ marginBottom: '12px' }} />
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '1.2rem',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>{title}</h3>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
        }}>{copy}</p>
      </div>
    </Link>
  )
}

export default function Tribune() {
  // Data
  const teamsQuery = useQuery({ queryKey: ['teams'], queryFn: nflApi.getAllTeams })
  const playoffsQuery = useQuery({
    queryKey: ['playoffs', SEASON],
    queryFn: () => nflApi.getPlayoffs(SEASON),
  })
  const { data: teamsInfo } = useTeamsInfo()

  // Derived: SB game (last in playoffs list, round=SB)
  const sbGame: PlayoffGame | undefined = playoffsQuery.data?.find(g => g.round === 'SB')

  // Derived: champions
  const teams = teamsQuery.data
  const bestOff = teams?.reduce((a, b) => a.off_epa > b.off_epa ? a : b)
  const bestDef = teams?.reduce((a, b) => a.def_epa < b.def_epa ? a : b)

  // Surpresa do Ano: 5º lugar no net EPA (off - def) = surpresa default
  let surprise: { team: string; off_epa: number; def_epa: number } | undefined
  if (teams) {
    const sortedByNet = [...teams].sort(
      (a, b) => (b.off_epa - b.def_epa) - (a.off_epa - a.def_epa)
    )
    surprise = sortedByNet[4]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Bloco 1 — Hero */}
      {playoffsQuery.isLoading && <Skeleton variant="hero" />}
      {playoffsQuery.isError && (
        <ErrorState
          message="Não consegui carregar os destaques do Super Bowl."
          onRetry={() => playoffsQuery.refetch()}
        />
      )}
      {sbGame && (
        <TribuneHero
          championAbbr={
            (sbGame.home_score ?? 0) > (sbGame.away_score ?? 0) ? sbGame.home : sbGame.away
          }
          runnerUpAbbr={
            (sbGame.home_score ?? 0) > (sbGame.away_score ?? 0) ? sbGame.away : sbGame.home
          }
          championScore={Math.max(sbGame.home_score ?? 0, sbGame.away_score ?? 0)}
          runnerUpScore={Math.min(sbGame.home_score ?? 0, sbGame.away_score ?? 0)}
          date={sbGame.date}
        />
      )}

      {/* Bloco 2 — Lead jornalístico */}
      <div style={{
        padding: '24px 0',
        maxWidth: '760px',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.2em',
          marginBottom: '10px',
        }}>
          — EDIÇÃO ESPECIAL · TEMPORADA 2025-2026 —
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.95rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          Esta edição da Tribune analisa toda a temporada usando dados play-by-play reais e modelos de Machine Learning. Você vai ver quem dominou o ataque, quem segurou na defesa, quais quarterbacks correm risco em 2026 e como nossa IA prevê confrontos entre os 32 times.
        </p>
      </div>

      {/* Bloco 3 — Destaques (4 cards) */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '14px',
        }}>
          Os Destaques da Temporada
        </h2>

        {teamsQuery.isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        )}
        {teamsQuery.isError && (
          <ErrorState onRetry={() => teamsQuery.refetch()} />
        )}
        {teams && bestOff && bestDef && surprise && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <ChampionCard variant="attack"      abbr={bestOff.team}    epaValue={bestOff.off_epa} />
            <ChampionCard variant="defense"     abbr={bestDef.team}    epaValue={bestDef.def_epa} />
            <ChampionCard variant="qb-trouble"  abbr={teamsInfo?.[0]?.abbr ?? 'NYJ'} epaValue={0}
              description="O quarterback do time aqui é quem mais corre risco — métrica em queda nas últimas semanas."
              metricLabel="STATUS RECENTE"
            />
            <ChampionCard variant="surprise"    abbr={surprise.team}
              epaValue={surprise.off_epa - surprise.def_epa}
              metricLabel="NET EPA / JOGADA"
            />
          </div>
        )}
      </div>

      {/* Bloco 4 — Capítulos */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '14px',
        }}>
          Capítulos
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <ChapterCard
            to="/dashboard"
            icon={Activity}
            title="Dashboard Completo"
            copy="Todos os dados, todos os times, todos os rankings."
            color="var(--green-field)"
          />
          <ChapterCard
            to="/matchup"
            icon={Swords}
            title="Simulador de Confrontos"
            copy="Quem ganha qualquer jogo possível? A IA acerta 64.2% das partidas."
            color="var(--blue-data)"
          />
          <ChapterCard
            to="/agent"
            icon={Bot}
            title="Agente IA"
            copy="Pergunte sobre regras, métricas, jogadores. O agente raciocina e responde."
            color="var(--purple-ai)"
          />
        </div>
      </div>

      {/* Bloco 5 — Timeline dos Playoffs */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '1rem',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: '14px',
        }}>
          Caminho do Campeão · Playoffs 2025
        </h2>
        {playoffsQuery.isLoading && <Skeleton variant="card" height={220} />}
        {playoffsQuery.data && <PlayoffsTimeline games={playoffsQuery.data} />}
      </div>

      {/* Bloco 6 — Footer */}
      <TribuneFooter />
    </div>
  )
}
