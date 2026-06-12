# 🏈 NFL Analytics Lab

Projeto de portfólio combinando **Machine Learning**, **LLM + RAG**, **Agentes de IA** e **Visão Computacional** aplicados à NFL — apresentado como uma "revista digital" da temporada 2025-2026.

> Construído para estudo, análise e publicação no GitHub/LinkedIn.

---

## ✨ O que tem aqui

- **NFL Tribune** (`/`) — landing estilo revista esportiva: manchete do Super Bowl LX (NE 13 × SEA 29), destaques da temporada, bracket dos playoffs.
- **Dashboard** (`/dashboard`) — campeões da temporada, ranking dos 32 times, análise do quarterback do seu time.
- **Confronto** (`/matchup`) — compara dois times com previsão da IA, duelos ataque×defesa e radar de eficiência.
- **Agente IA** (`/agent`) — IA com ReAct + tool calling que busca dados ao vivo enquanto raciocina.
- **Enciclopédia** (`/encyclopedia`) — glossário curado de métricas, táticas e regras.
- **Visão CV** (`/vision`) — análise de formações via play-by-play + diagramas + OpenCV pra imagens.
- **Chat Widget global** — bolinha flutuante em qualquer página, com 2 modos (RAG rápido + Agente profundo). Conversa persiste em `localStorage`.

---

## 🧠 Módulos

### ✅ Módulo 1 — Machine Learning Clássico
- **Win Predictor**: XGBoost treinado com EPA e Success Rate de **4 temporadas** (2022-2025). Acurácia **64.2%**, ROC-AUC **0.674**, CV ROC-AUC **0.695 ± 0.039** com 869 jogos no treino.
- **Berlinda do QB**: Alertas para quarterbacks com EPA negativo nos últimos jogos (CRÍTICO/ALERTA/ATENÇÃO/SEGURO).
- **Matchup Radar**: Probabilidade de vitória + radar comparativo de stats + duelos ataque×defesa explicados em PT-BR.
- **Player Props**: Floor & Ceiling de yardas por jogador.

### ✅ Módulo 2 — LLM + RAG (Ollama)
- Chat em português sobre NFL — disponível via widget global em qualquer página.
- Base de conhecimento com 15+ documentos (regras, métricas, táticas, contexto histórico).
- Retrieval com **ChromaDB** + **sentence-transformers** (`all-MiniLM-L6-v2`).
- Geração com **Ollama** (`llama3.1`) via `httpx`.

### ✅ Módulo 3 — Agente de IA (ReAct + Tool Calling)
- Agente ReAct com **5 ferramentas**: `get_team_stats`, `predict_matchup`, `check_qb_hot_seat`, `search_nfl_knowledge`, `get_team_rankings`.
- Reasoning chain visível: `thinking → tool_call → tool_result → answer`.
- Interface multi-turn com histórico mantido entre perguntas.
- Fallback automático sem LLM via keyword matching.

### ✅ Módulo 4 — Visão Computacional
- **Formações por Time**: selecione um time e veja as formações ofensivas reais (Shotgun, Pistol, Under Center...) e as coberturas defensivas (Cover 0–6, 2-Man) que ele usou na temporada — % de uso, EPA e diagramas de campo nas cores do time.
- Resumo do personnel defensivo: % de snaps em Nickel/Dime/Base, defensores na caixa e taxa de blitz.
- Análise de EPA por formação com as tags reais do play-by-play (NGS, ~74% das jogadas).
- Diagramas de campo estilizados (matplotlib) para 8 formações ofensivas + 7 coberturas.
- Detecção de jogadores em imagens com **OpenCV (HoughCircles)**.

> 📝 Nota de dado: a partir de 2023 o NGS público só classifica SHOTGUN / UNDER CENTER / PISTOL. A temporada 2022 tem a taxonomia completa (Empty, I-Form, Singleback, Jumbo, Wildcat) — use o seletor de temporada pra explorar.

---

## 🗂 Estrutura

```
nfl-analytics/
├── docker-compose.yml          # Orquestra backend + frontend (Ollama nativo no host)
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Configurações (seasons 2022-2025)
│   ├── data/loader.py          # Download e cache (nfl_data_py)
│   ├── ml/
│   │   ├── features.py         # EPA, CPOE, Success Rate, Player Props
│   │   ├── train.py            # Treinamento XGBoost
│   │   ├── predictor.py        # Inferência
│   │   └── teams_info.py       # Metadata oficial dos 32 times (logo, cor)
│   ├── rag/                    # Módulo 2 — RAG + ChromaDB
│   ├── agent/                  # Módulo 3 — ReAct + Tool Calling
│   ├── vision/                 # Módulo 4 — CV
│   └── routers/                # Endpoints FastAPI por módulo
└── frontend/
    └── src/
        ├── api/nflApi.ts       # Client HTTP
        ├── hooks/
        │   ├── useTeamInfo.ts  # Cache de metadata dos times + normalização de abbrs
        │   └── useCountUp.ts   # Animação de contadores via IntersectionObserver
        ├── utils/teamColors.ts # Detecção de conflito de cores entre times
        ├── components/
        │   ├── layout/         # Navbar, MobileDrawer
        │   ├── ml/             # HotSeat (berlinda), MatchupRadar
        │   ├── team/           # TeamCard, TeamHero, TeamChip, ChampionCard
        │   ├── tribune/        # TribuneHero, PlayoffsTimeline, TribuneFooter
        │   ├── chat/           # TribuneChatWidget (RAG + Agent)
        │   ├── vision/         # FormationExplorer (formações por time)
        │   └── ui/             # Skeleton, ErrorState, EmptyState, Abbr (glossário)
        ├── pages/              # Tribune, Dashboard, Matchup, Encyclopedia, Agent, Vision
        └── styles/global.css   # Design system light pro + responsivo ≤768px
```

---

## 🚀 Como rodar

### Pré-requisitos
- Docker Desktop (Windows/Mac/Linux) com 8 GB+ RAM alocados.
- Ollama nativo instalado e rodando no host com modelo `llama3.1` baixado:
  ```bash
  ollama pull llama3.1
  ```
  > ⚠️ Use `llama3.1` (e não `llama3` base) — o base não suporta tool calling, e o agente do Módulo 3 quebra sem isso.
- ~10 GB de disco livre (5 GB Ollama + 4 GB imagens Docker + 1 GB caches de dados).
- Internet na primeira execução (download via `nfl_data_py`).

### Subir tudo

```bash
docker compose up -d
```

Primeira execução demora **5-15 min** (download de play-by-play + treino do XGBoost + indexação ChromaDB). Acompanhe com:

```bash
docker compose logs -f backend
```

Pronto quando aparecer `Uvicorn running on http://0.0.0.0:8000`.

### Acessar

| Endereço | O que tem |
|---|---|
| http://localhost:5173 | Frontend — entrada pela **Tribune** |
| http://localhost:5173/dashboard | Dashboard com rankings |
| http://localhost:8000/docs | Swagger UI da API |
| http://localhost:8000/health | Healthcheck |

### Makefile

```bash
make up       # docker compose up -d
make logs     # logs de tudo
make status   # status dos containers + healthchecks
make down     # parar
```

### Retreinar o modelo

Quando os dados de uma nova season terminarem (geralmente fevereiro):

```bash
docker compose exec backend python -m ml.train
docker compose restart backend
```

O `ml/train.py` lê `settings.nfl_seasons` (em `config.py` ou via `.env`), baixa os dados que faltam, calcula features, treina e salva o modelo + métricas em `models/`.

---

## 🔌 Exemplos de uso da API

A API tem ~15 endpoints divididos em 4 módulos. Exemplos práticos:

### Top times da temporada

```bash
# Top 5 ataques (off_epa)
curl -s http://localhost:8000/ml/teams \
  | python -c "import sys, json; d=json.load(sys.stdin); top=sorted(d, key=lambda x: x['off_epa'], reverse=True)[:5]; [print(f\"{i+1}. {t['team']:4} +{t['off_epa']:.4f}\") for i,t in enumerate(top)]"
```

Saída esperada (temporada 2025):
```
1. LA   +0.1473
2. BUF  +0.1405
3. GB   +0.1291
4. DAL  +0.1110
5. NE   +0.0920
```

### Probabilidade de vitória num confronto

```bash
curl -s http://localhost:8000/ml/matchup/NE/SEA \
  | python -c "import sys, json; d=json.load(sys.stdin); print(f\"NE {d['home_win_probability']*100:.1f}% × {d['away_win_probability']*100:.1f}% SEA\"); print(f\"Insight: {d.get('insight')}\")"
```

```
NE 63.5% × 36.5% SEA
Insight: Leve favoritismo do NE. O mando de campo faz diferença aqui.
```

### Caminho do campeão (playoffs)

```bash
curl -s http://localhost:8000/ml/playoffs/2025 \
  | python -c "import sys, json; [print(f\"{g['round']:4} {g['date']}  {g['away']:3} {g['away_score']:2} @ {g['home']:3} {g['home_score']:2}\") for g in json.load(sys.stdin)]"
```

```
WC   2026-01-10  LA  34 @ CAR 31
WC   2026-01-10  GB  27 @ CHI 31
WC   2026-01-11  BUF 27 @ JAX 24
...
SB   2026-02-08  SEA 29 @ NE  13
```

### Berlinda do quarterback

```bash
curl -s http://localhost:8000/ml/hot-seat/NYJ \
  | python -c "import sys, json; d=json.load(sys.stdin); print(f\"{d['quarterback']} ({d['team']}): {d['severity']}\"); print(f\"  EPA recente: {d['recent_epa']:+.3f} | CPOE: {d['recent_cpoe']:+.1f}% | Tendência: {d['trend']}\"); print(f\"  → {d['message']}\")"
```

### Pergunta livre via RAG

```bash
curl -s -X POST http://localhost:8000/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "O que é EPA e como ele é calculado?"}' \
  | python -c "import sys, json; d=json.load(sys.stdin); print(d['answer']); print('\\nFontes:', [s['title'] for s in d['sources']])"
```

### Agente com tool calling

```bash
curl -s -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Qual o melhor ataque da liga e por quê?"}' \
  | python -c "import sys, json; d=json.load(sys.stdin); print('Tools usadas:', d['tools_used']); print('\\nResposta:', d['answer'])"
```

A IA decide sozinha quais ferramentas chamar (`get_team_rankings`, `get_team_stats`, etc.) e devolve a resposta com a chain de raciocínio.

### Análise de formações

```bash
# Liga toda
curl -s "http://localhost:8000/vision/formations/data" \
  | python -c "import sys, json; d=json.load(sys.stdin); [print(f\"{lab:30}  EPA {d['chart']['epa'][i]:+.3f}  uso {d['chart']['usage'][i]:.1f}%\") for i, lab in enumerate(d['chart']['labels'])]"

# Filtrado por time
curl -s "http://localhost:8000/vision/formations/data?team=KC" | python -m json.tool

# Formações + coberturas de um time específico (com % de uso e EPA)
curl -s "http://localhost:8000/vision/team-formations?team=KC&season=2025" | python -m json.tool

# Diagrama de uma cobertura nas cores do time (PNG base64)
curl -s "http://localhost:8000/vision/team-formations/diagram/defense/COVER_3?team=KC"
```

---

## 📊 Stack técnica

| Camada | Tecnologia |
|---|---|
| Dados | `nfl_data_py 0.3.3`, `pandas 1.5.x`, `numpy <2.0` |
| ML | `scikit-learn`, `XGBoost` |
| LLM | Ollama nativo no host (`llama3.1`) |
| RAG | `ChromaDB` + `sentence-transformers (all-MiniLM-L6-v2)` |
| Agente | Ollama Tool Calling via `httpx` |
| Visão | `OpenCV` (HoughCircles), `matplotlib` |
| API | `FastAPI` + `uvicorn` |
| Frontend | `React 18` + `Vite` + `TypeScript` + `Recharts` + `react-query` + `react-router-dom` + `lucide-react` |
| Deploy | Docker Compose |

---

## 📌 Métricas explicadas

- **EPA (Expected Points Added)** — Quanto cada jogada adiciona ou subtrai dos pontos esperados. Métrica central de eficiência ofensiva e defensiva. Liga média ≈ 0.
- **CPOE (Completion % Over Expected)** — Quão acima do esperado o QB completa passes, considerando dificuldade da jogada (distância, cobertura, pressão).
- **Success Rate** — % de jogadas que atingem o ganho mínimo esperado pra cada down (40% / 60% / 100%). Ignora "garbage time" e mede consistência real.
- **Win Probability** — Probabilidade de vitória prevista pelo XGBoost com base em EPA, Success Rate de ataque/defesa e mando de campo.

> 💡 No frontend, esses termos têm tooltip explicativo (ver `<Abbr term="EPA" />`) — passe o mouse sobre eles em qualquer página.

---

## 🛠 Decisões de arquitetura que valem documentar

- **Ollama é nativo do host**, não containerizado. Evita re-baixar 5 GB de modelo. O backend usa `host.docker.internal:11434` via `extra_hosts` no compose.
- **`nfl_data_py` ainda usa abbrs históricas** no play-by-play (LA, OAK, SD, STL). O hook `useTeamInfo` normaliza em runtime pra abbrs canônicas (LAR, LV, LAC, LAR).
- **Vite proxy patterns precisam de barra final** (`/ml/`, `/agent/`, `/vision/`) — sem isso, GET na URL `/agent` direto no browser cai no backend e vira 404 em vez de servir a SPA.
- **Cache do `data_cache/*.pkl`** — uma vez baixado, não vai pra rede. Pra forçar refresh: `docker compose exec backend python -c "from data.loader import clear_cache; clear_cache()"`.

---

## 📝 Licença

MIT — use, estude, publique e cite o repositório.
