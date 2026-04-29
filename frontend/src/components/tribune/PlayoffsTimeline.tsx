import { PlayoffGame } from '../../api/nflApi'
import { useTeam } from '../../hooks/useTeamInfo'

const ROUND_LABELS: Record<string, string> = {
  WC: 'Wild Card',
  DIV: 'Divisional',
  CONF: 'Conference',
  SB: 'Super Bowl',
}

function GameCell({ game }: { game: PlayoffGame }) {
  const home = useTeam(game.home)
  const away = useTeam(game.away)
  const homeWins = (game.home_score ?? 0) > (game.away_score ?? 0)
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '8px 10px',
      minWidth: '140px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {[{ team: away, score: game.away_score, win: !homeWins },
        { team: home, score: game.home_score, win: homeWins }].map((side, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          opacity: side.win ? 1 : 0.55,
          fontWeight: side.win ? 700 : 400,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {side.team && (
              <img src={side.team.logo} alt={side.team.abbr}
                   style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
            )}
            {side.team?.abbr ?? '???'}
          </span>
          <span>{side.score ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  games: PlayoffGame[]
}

export default function PlayoffsTimeline({ games }: Props) {
  const rounds = ['WC', 'DIV', 'CONF', 'SB']
  const byRound = rounds.map(r => games.filter(g => g.round === r))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px',
      padding: '20px',
      background: 'var(--bg-field)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
    }}>
      {byRound.map((roundGames, i) => (
        <div key={rounds[i]} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
            paddingBottom: '4px',
            borderBottom: '1px solid var(--border)',
            marginBottom: '4px',
          }}>
            {ROUND_LABELS[rounds[i]]}
          </div>
          {roundGames.length === 0 ? (
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              padding: '20px 0',
            }}>
              —
            </div>
          ) : (
            roundGames.map((g, idx) => <GameCell key={idx} game={g} />)
          )}
        </div>
      ))}
    </div>
  )
}
