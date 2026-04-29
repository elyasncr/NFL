export default function TribuneFooter() {
  return (
    <footer style={{
      background: 'var(--bg-field)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.7rem',
      color: 'var(--text-muted)',
      lineHeight: 1.6,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '6px' }}>
        Construído com <strong style={{ color: 'var(--text-secondary)' }}>FastAPI · React · XGBoost · ChromaDB · Ollama</strong>
      </div>
      <div>
        Dados do <strong style={{ color: 'var(--text-secondary)' }}>nfl_data_py</strong> (temporadas 2022-2025) · Modelo retreinado em abril/2026
      </div>
    </footer>
  )
}
