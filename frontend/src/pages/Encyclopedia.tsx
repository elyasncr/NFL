import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import Skeleton from '../components/ui/Skeleton'

interface Term {
  term: string
  definition: string
  complexity: 'Básico' | 'Intermediário' | 'Avançado'
  formula?: string
}

interface Category {
  id: string
  title: string
  emoji: string
  description: string
  terms: Term[]
}

const ENCYCLOPEDIA: Category[] = [
  {
    id: 'sabermetrics',
    title: 'Analytics Avançado',
    emoji: '📊',
    description: 'As métricas que usamos nos nossos modelos de ML',
    terms: [
      {
        term: 'EPA — Expected Points Added',
        complexity: 'Avançado',
        definition:
          'Mede o valor de cada jogada em pontos esperados. Uma corrida de 5 jardas numa 3ª para 2 vale muito mais (EPA alto) do que a mesma corrida numa 3ª para 20 (EPA baixo ou negativo). É a métrica central do nosso modelo.',
        formula: 'EPA = Pontos Esperados Após a Jogada − Pontos Esperados Antes da Jogada',
      },
      {
        term: 'CPOE — Completion % Over Expected',
        complexity: 'Avançado',
        definition:
          'Mede a precisão real do QB. Compara a % de passes completos com a probabilidade matemática de completar aquele exato passe (dado a distância, a cobertura, a pressão). CPOE > 0 significa que o QB é melhor que a média.',
        formula: 'CPOE = Completion% Real − Completion% Esperada pelo Modelo',
      },
      {
        term: 'Success Rate',
        complexity: 'Intermediário',
        definition:
          'Uma jogada é "sucesso" se ganha 40% das jardas na 1ª descida, 60% na 2ª, e 100% na 3ª ou 4ª descida. Ignora "garbage time" e mede consistência real do ataque.',
        formula: '1ª: ≥40% | 2ª: ≥60% | 3ª/4ª: Conversão = Sucesso',
      },
      {
        term: 'ANY/A — Adjusted Net Yards per Attempt',
        complexity: 'Intermediário',
        definition:
          'Versão aprimorada do yards per attempt. Adiciona pontuação para touchdowns e penaliza interceptions e sacks, dando uma visão mais completa da eficiência do QB por tentativa.',
        formula: '(Yards + 20×TD − 45×INT − SackYards) / (Tentativas + Sacks)',
      },
      {
        term: 'DVOA — Defense-adjusted Value Over Average',
        complexity: 'Avançado',
        definition:
          'Ajusta o EPA pelo nível da defesa adversária. Um EPA alto contra uma defesa fraca vale menos do que o mesmo EPA contra uma elite. Nosso modelo usa EPA bruto — DVOA seria uma evolução futura.',
      },
    ],
  },
  {
    id: 'tactics',
    title: 'Táticas e Esquemas',
    emoji: '♟️',
    description: 'O xadrez dentro do futebol americano',
    terms: [
      {
        term: 'Blitz',
        complexity: 'Intermediário',
        definition:
          'A defesa envia mais de 4 rusher para pressionar o QB. Sacrifica cobertura de passe para tentar o sack. Um QB com EPA alto contra blitz tem valor enorme — demonstra leitura de jogo avançada.',
      },
      {
        term: 'Play Action',
        complexity: 'Básico',
        definition:
          'O QB finge entregar a bola (handoff) para o running back antes de passar. Força os linebackers a darem um passo para frente, abrindo janelas no meio do campo. Times com bom jogo de corrida se beneficiam mais.',
      },
      {
        term: 'RPO — Run-Pass Option',
        complexity: 'Intermediário',
        definition:
          'O QB decide no último momento entre entregar para o RB correr ou lançar para um receptor. A decisão é baseada no comportamento do linebacker. Cria dilemas impossíveis para a defesa.',
      },
      {
        term: 'Cover 2 / Cover 3 / Cover 4',
        complexity: 'Intermediário',
        definition:
          'Esquemas de cobertura que dividem o campo entre os defensivos. Cover 2 = dois safety cobrindo as zonas profundas. Cover 3 = três zonas profundas. Cover 4 = quatro. Cada um tem fraquezas específicas exploráveis pelo ataque.',
      },
    ],
  },
  {
    id: 'rules',
    title: 'Regras Essenciais',
    emoji: '📜',
    description: 'As regras que aparecem nos nossos dados',
    terms: [
      {
        term: 'Holding (Segurada)',
        complexity: 'Básico',
        definition:
          'Agarrar um adversário que não tem a bola. No ataque: -10 jardas. Na defesa: +5 jardas E 1ª descida automática ao adversário. Seguradas defensivas são ouro para um drive.',
      },
      {
        term: 'Pass Interference',
        complexity: 'Básico',
        definition:
          'Contato que impede o receptor de tentar pegar o passe. Defensiva: bola vai pro local da falta (pode ser +40 jardas). Ofensiva: -10 jardas. A PI defensiva é uma das penalidades mais impactantes do jogo.',
      },
      {
        term: '2-Minute Drill',
        complexity: 'Intermediário',
        definition:
          'Modo de operação do ataque nos últimos 2 minutos de cada tempo. Ritmo acelerado, sem huddle, timeouts estratégicos. Times com QBs que têm EPA alto no "2-minute drill" são muito mais perigosos.',
      },
      {
        term: 'Onside Kick',
        complexity: 'Básico',
        definition:
          'Chute curto tentando recuperar a bola para o time que chutou. Necessário pelo menos 10 jardas de distância para o time que chuta ter direito à bola. Jogada de desespero com baixa taxa de sucesso (~25%).',
      },
    ],
  },
  {
    id: 'ml_concepts',
    title: 'Machine Learning Aplicado',
    emoji: '🤖',
    description: 'Os conceitos de ML que usamos no projeto',
    terms: [
      {
        term: 'Regressão Logística',
        complexity: 'Intermediário',
        definition:
          'Algoritmo que mapeia features (EPA, Success Rate) para uma probabilidade entre 0 e 1. No nosso caso: P(vitória da casa). Simples, interpretável, e surpreendentemente eficaz em problemas de classificação binária.',
        formula: 'P(y=1) = 1 / (1 + e^(−(β₀ + β₁x₁ + ... + βₙxₙ)))',
      },
      {
        term: 'XGBoost',
        complexity: 'Avançado',
        definition:
          'Gradient Boosting em árvores de decisão. Mais poderoso que Regressão Logística porque captura relações não-lineares entre as features. É o algoritmo principal do nosso Win Predictor.',
      },
      {
        term: 'ROC-AUC',
        complexity: 'Intermediário',
        definition:
          'Métrica de avaliação do modelo. Mede a capacidade de distinguir vitória de derrota. 0.5 = chute aleatório. 1.0 = perfeito. Nosso modelo mira ≥0.72, que é robusto para predição de jogos.',
      },
      {
        term: 'RAG — Retrieval-Augmented Generation',
        complexity: 'Avançado',
        definition:
          'Técnica que combina busca semântica (ChromaDB) com geração de texto (Ollama/LLM). Em vez de o LLM "aluciná" respostas, ele busca documentos relevantes primeiro e usa como contexto. Módulo 2 do projeto.',
      },
    ],
  },
]

const complexityColor = {
  'Básico': 'badge-green',
  'Intermediário': 'badge-amber',
  'Avançado': 'badge-red',
}

function TermAccordion({ term }: { term: Term }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        border: `1px solid ${open ? 'var(--border-active)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 18px',
          background: open ? 'var(--bg-card-hover)' : 'var(--bg-card)',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {open ? <ChevronDown size={14} color="var(--green-field)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            textAlign: 'left',
            letterSpacing: '0.02em',
          }}>
            {term.term}
          </span>
        </div>
        <span className={`badge ${complexityColor[term.complexity]}`}>
          {term.complexity}
        </span>
      </button>

      {open && (
        <div style={{
          padding: '16px 18px 18px 42px',
          background: 'var(--bg-field)',
          borderTop: '1px solid var(--border)',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.7',
            marginBottom: term.formula ? '14px' : 0,
          }}>
            {term.definition}
          </p>
          {term.formula && (
            <div style={{
              background: 'var(--bg-field)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--green-field)',
              letterSpacing: '0.02em',
            }}>
              <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>f(x) =</span>
              {term.formula}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Encyclopedia() {
  const [activeCategory, setActiveCategory] = useState('sabermetrics')

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
          Enciclopédia <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ Sabermetrics NFL</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Tudo que você precisa saber pra entender os dados que usamos — sem enrolação.
        </p>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {ENCYCLOPEDIA.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`btn ${activeCategory === cat.id ? 'btn-primary' : 'btn-ghost'}`}
          >
            {cat.emoji} {cat.title}
          </button>
        ))}
      </div>

      {/* Content */}
      {ENCYCLOPEDIA.filter(c => c.id === activeCategory).map(cat => (
        <div key={cat.id} className="card">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.4rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {cat.emoji} {cat.title}
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {cat.description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cat.terms.map(term => (
              <TermAccordion key={term.term} term={term} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
