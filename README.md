# 🏈 NFL Analytics Lab

Projeto de portfólio completo combinando **Machine Learning**, **LLM + RAG**, **Agentes de IA** e **Visão Computacional** aplicados à NFL.

> Construído para estudo, análise e publicação no GitHub/LinkedIn.

---

## 🗂 Estrutura do Projeto

```
nfl-analytics/
├── docker-compose.yml        # Orquestra backend + frontend (Ollama nativo no host)
├── backend/
│   ├── main.py               # FastAPI app
│   ├── config.py             # Configurações centralizadas
│   ├── data/
│   │   └── loader.py         # Download e cache dos dados da NFL
│   ├── ml/
│   │   ├── features.py       # EPA, CPOE, Success Rate, Player Props
│   │   ├── train.py          # Treinamento XGBoost
│   │   └── predictor.py      # Inferência do modelo
│   ├── rag/                  # Módulo 2 — RAG + ChromaDB
│   ├── agent/                # Módulo 3 — Agente ReAct + Tool Calling
│   ├── vision/               # Módulo 4 — Visão Computacional
│   └── routers/              # Endpoints FastAPI por módulo
└── frontend/
    └── src/
        ├── api/nflApi.ts     # Client HTTP para a API
        ├── components/
        │   ├── layout/       # Navbar
        │   ├── ml/           # HotSeat, MatchupRadar
        │   ├── rag/          # Componentes do chat
        │   ├── agent/        # Componentes do agent
        │   └── vision/       # Componentes da visão
        └── pages/            # Dashboard, Matchup, Encyclopedia, Chat, Agent, Vision
```

---

## 🧠 Módulos do Projeto

### ✅ Módulo 1 — Machine Learning Clássico
- **Win Predictor**: XGBoost treinado com EPA e Success Rate de 3 temporadas (60.7% accuracy, 0.66 ROC-AUC CV)
- **A Berlinda**: Alertas para QBs com EPA negativo nos últimos 3 jogos
- **Matchup Radar**: Gráfico comparativo com probabilidade de vitória
- **Player Props**: Floor & Ceiling de yardas por jogador

### ✅ Módulo 2 — LLM + RAG (Ollama)
- Chat em português sobre NFL
- Base de conhecimento com 15 documentos (regras, métricas, táticas, contexto)
- Retrieval com ChromaDB + sentence-transformers (`all-MiniLM-L6-v2`)
- Geração com Ollama (`llama3.1`) via `httpx`

### ✅ Módulo 3 — Agente de IA (Ollama Tool Calling)
- Agente ReAct com 5 ferramentas: stats, predição ML, hot-seat, RAG, ranking
- Interface conversacional multi-turn com histórico
- Reasoning chain (thinking → tool_call → tool_result → answer) visível no frontend
- Fallback automático sem LLM via keyword matching

### ✅ Módulo 4 — Visão Computacional
- Análise de EPA por formação a partir de play-by-play (~37k jogadas/temporada)
- Geração de diagramas de campo estilizados (matplotlib)
- Detecção de jogadores em imagens com OpenCV (HoughCircles)

---

## 🚀 Como Rodar

### Pré-requisitos
- Docker Desktop (Windows/Mac/Linux) com 8 GB+ RAM alocados
- Ollama nativo instalado e rodando no host com modelo `llama3.1` baixado:
  ```bash
  ollama pull llama3.1
  ```
- ~10 GB de disco livre (5 GB Ollama + 4 GB imagens Docker + 1 GB caches)
- Internet na primeira execução (download de dados NFL via `nfl_data_py`)

### Subir tudo

```bash
docker compose up -d
```

Aguarde 5-15 min na primeira execução (download NFL data + treino XGBoost + indexação ChromaDB). Acompanhe com:

```bash
docker compose logs -f backend
```

Quando aparecer `Uvicorn running on http://0.0.0.0:8000`, está pronto.

### Acessar

- **Dashboard**: http://localhost:5173
- **API docs**: http://localhost:8000/docs
- **Healthcheck**: http://localhost:8000/health

### Usando o Makefile

```bash
make up       # docker compose up -d
make logs     # logs de tudo
make status   # status dos containers + healthchecks
make down     # parar
```

---

## 📊 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Dados | nfl_data_py 0.3.3, pandas 1.5.x |
| ML | scikit-learn, XGBoost |
| LLM | Ollama nativo no host (llama3.1) |
| RAG | ChromaDB + sentence-transformers |
| Agente | Ollama Tool Calling via httpx |
| Visão | OpenCV (HoughCircles), matplotlib |
| API | FastAPI |
| Frontend | React + Vite + Recharts |
| Deploy | Docker Compose |

---

## 📌 Métricas Explicadas

- **EPA (Expected Points Added)**: Valor de cada jogada em pontos esperados
- **CPOE (Completion % Over Expected)**: Precisão real do QB vs. média esperada
- **Success Rate**: % de jogadas estatisticamente bem-sucedidas (ignora garbage time)

---

## 📝 Licença

MIT — use, estude, publique e cite o repositório.
