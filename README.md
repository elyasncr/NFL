<<<<<<< HEAD
# 🏈 NFL Analytics Lab

Projeto de portfólio completo combinando **Machine Learning**, **LLM + RAG**, **Agentes de IA** e **Visão Computacional** aplicados à NFL.

> Construído para estudo, análise e publicação no GitHub/LinkedIn.

---

## 🗂 Estrutura do Projeto

```
nfl-analytics/
├── docker-compose.yml        # Orquestra backend + frontend + ollama
├── backend/
│   ├── main.py               # FastAPI app
│   ├── config.py             # Configurações centralizadas
│   ├── data/
│   │   └── loader.py         # Download e cache dos dados da NFL
│   ├── ml/
│   │   ├── features.py       # EPA, CPOE, Success Rate, Player Props
│   │   ├── train.py          # Treinamento XGBoost
│   │   └── predictor.py      # Inferência do modelo
│   ├── rag/                  # Módulo 2 (em desenvolvimento)
│   ├── agent/                # Módulo 3 (em desenvolvimento)
│   ├── vision/               # Módulo 4 (em desenvolvimento)
│   └── routers/              # Endpoints FastAPI por módulo
└── frontend/
    └── src/
        ├── api/nflApi.ts     # Client HTTP para a API
        ├── components/
        │   ├── layout/       # Navbar
        │   └── ml/           # HotSeat, MatchupRadar
        └── pages/            # Dashboard, Matchup, Encyclopedia
```

---

## 🧠 Módulos do Projeto

### ✅ Módulo 1 — Machine Learning Clássico
- **Win Predictor**: XGBoost treinado com EPA e Success Rate de 3 temporadas
- **A Berlinda**: Alertas para QBs com EPA negativo nos últimos 3 jogos
- **Matchup Radar**: Gráfico comparativo com probabilidade de vitória
- **Player Props**: Floor & Ceiling de yardas por jogador

### 🚧 Módulo 2 — LLM + RAG (Ollama)
- Chat em português sobre NFL
- Base de conhecimento com regras e estatísticas históricas
- Explicação de jogadas em linguagem natural

### 🚧 Módulo 3 — Agente de IA (LangGraph)
- Agente com ferramentas: busca stats, roda ML, consulta RAG
- Interface conversacional multi-turn
- Reasoning chain visível no frontend

### 🚧 Módulo 4 — Visão Computacional
- Detecção de formações táticas (YOLOv8)
- Classificação de esquemas ofensivos/defensivos

---

## 🚀 Como Rodar

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- (Opcional) Docker + Docker Compose

### Opção A — Local (sem Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt

# 1. Treina o modelo (baixa dados da NFL ~5min na primeira vez)
python -m ml.train

# 2. Sobe a API
uvicorn main:app --reload
# API disponível em http://localhost:8000
# Docs interativos em http://localhost:8000/docs
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Dashboard disponível em http://localhost:5173
```

### Opção B — Docker Compose
```bash
docker-compose up --build
```

---

## 📊 Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Dados | nfl_data_py |
| ML | Scikit-Learn, XGBoost |
| LLM | Ollama (llama3, local) |
| RAG | LangChain + ChromaDB |
| Agente | LangGraph |
| Visão | OpenCV, YOLOv8 |
| API | FastAPI |
| Frontend | React + Recharts |
| Deploy | Docker Compose |

---

## 📌 Métricas Explicadas

- **EPA (Expected Points Added)**: Valor de cada jogada em pontos esperados
- **CPOE (Completion % Over Expected)**: Precisão real do QB vs. média esperada
- **Success Rate**: % de jogadas estatisticamente bem-sucedidas (ignora garbage time)

---

## 📝 Licença

MIT — use, estude, publique e cite o repositório.
=======
# NFL
Estudo sobre LLM, Machine Learning, Visão Computacional e Container
>>>>>>> cdb0430652ee8a0ffbfffbd41684d3e7fffc64e7
