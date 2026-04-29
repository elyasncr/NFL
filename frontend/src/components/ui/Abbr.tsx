const GLOSSARY: Record<string, string> = {
  EPA: 'Expected Points Added — pontos esperados que cada jogada adiciona ou tira.',
  'Off EPA': 'EPA gerado pelo ataque por jogada. Maior = melhor ataque.',
  'Def EPA': 'EPA permitido pela defesa por jogada. Menor = melhor defesa.',
  CPOE: 'Completion Percentage Over Expected — quão acima do esperado o QB acerta passes.',
  QB: 'Quarterback — passador, líder do ataque.',
  'Success Rate': 'Taxa de sucesso — % de jogadas que ganham EPA positivo.',
  'Win Probability': 'Probabilidade de vitória estimada pelo modelo de IA.',
  'ROC-AUC': 'Métrica que mede a qualidade do ranking de probabilidades do modelo (1 = perfeito, 0.5 = aleatório).',
}

interface Props {
  term: string
  children?: React.ReactNode
}

export default function Abbr({ term, children }: Props) {
  const definition = GLOSSARY[term]
  if (!definition) return <>{children ?? term}</>
  return (
    <abbr
      title={definition}
      style={{
        textDecoration: 'underline dotted',
        textDecorationColor: 'var(--text-muted)',
        cursor: 'help',
      }}
    >
      {children ?? term}
    </abbr>
  )
}
