import MatchupRadar from '../components/ml/MatchupRadar'

export default function Matchup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '2.4rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          Raio-X <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ Confronto Direto</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Compare dois times. O modelo XGBoost calcula a probabilidade de vitória
          com base em EPA, Success Rate e vantagem de mando.
        </p>
      </div>

      <div className="card">
        <MatchupRadar />
      </div>
    </div>
  )
}
