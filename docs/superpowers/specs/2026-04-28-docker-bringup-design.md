# Docker Bringup & Smoke Test — NFL Analytics Lab

**Data:** 2026-04-28
**Autor:** Claude (Opus 4.7) + @mauryneto010
**Status:** ✅ Executado em 2026-04-28 — PASS (com fixes)

---

## Contexto

O projeto NFL Analytics Lab está com os 4 módulos do backend já codados (ML, RAG, Agent, Vision) e o frontend com todas as 6 páginas implementadas. O `README.md` está desatualizado, marcando módulos 2/3/4 como "🚧 em desenvolvimento" quando na verdade já existem.

O usuário **nunca rodou** `docker compose up` neste projeto. Roda em Windows 11. Quer testar tudo hoje.

## Objetivo

Trazer todos os serviços ao ar em Docker, validar via smoke tests ponta-a-ponta os 4 módulos (backend + frontend), corrigir o que estiver quebrado, e atualizar o README pra refletir o estado real.

## Não-Objetivos

Explicitamente fora de escopo neste ciclo:

- Refatorar código que já funciona
- Adicionar features novas (streaming, mais tools, YOLOv8 real)
- Trocar versões de bibliotecas sem motivo de quebra
- Reescrever UI
- Setup de produção (nginx, prod compose)

## Restrições

- **Plataforma:** Windows 11 + Docker Desktop. Sensível a line endings (CRLF vs LF) em scripts shell.
- **Tempo:** primeira execução = ~30-60 min total (downloads + treino).
- **Recursos:** llama3 quer ~6-8GB RAM em uso. Disco: ~10GB livre (4GB ollama + 500MB nfl_data + ~3GB de imagens Docker).
- **Rede:** primeira execução exige internet pra baixar llama3 (~4GB), nfl_data_py (~500MB), sentence-transformers (~80MB), e imagens Docker.

## Arquitetura

Já existente — sem mudanças. Documentada aqui pra referência.

```
┌─────────────────┐     ┌──────────────────┐
│ nfl_dashboard   │────▶│ nfl_api          │
│ (Vite :5173)    │ HTTP│ (FastAPI :8000)  │
└─────────────────┘     └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ nfl_ollama       │
                        │ (llama3 :11434)  │
                        └──────────────────┘

Volumes persistentes:
  ollama_data       — modelo llama3
  nfl_data_cache    — play-by-play NFL
  nfl_models        — XGBoost (.pkl)
  nfl_chroma        — índice ChromaDB
  frontend_node_modules
```

## Plano de Execução

### Fase 1 — Pre-flight Audit (estático)

Antes de qualquer `docker compose up`, valido os seguintes itens. Fix inline quando aplicável (sem rebuild prematuro).

| # | Item | Verificação | Fix |
|---|---|---|---|
| 1 | `backend/entrypoint.sh` line endings | Inspeção byte-a-byte (procurar `\r`) | Reescrever com LF puro |
| 2 | Portas 5173, 8000, 11434 livres | `netstat -ano \| findstr ":5173"` etc | Avisar usuário, não mudar mapeamento |
| 3 | Docker Desktop ativo + recursos | `docker info`, `docker version` | Avisar usuário se falta |
| 4 | `requirements.txt` — versões problemáticas | Inspeção visual | Substituir só se quebrar build |
| 5 | `nflApi.ts` baseURL | Já validado: usa `''` quando porta=5173 (Vite proxy) | — |
| 6 | `.env` carregado | Já validado | — |
| 7 | Imports do FastAPI | Já validado: `WORKDIR=/app` resolve | — |

**Critério de saída da Fase 1:** todos os itens verificados, fixes aplicados.

### Fase 2 — Bringup

```bash
# Working dir: d:/AI Solution/NFL-Analytics/
docker compose build              # build paralelo backend + frontend
docker compose up -d              # background
docker compose logs -f --tail 100 # acompanhar
```

**Marcos esperados nos logs (ordem):**

1. `nfl_ollama` healthy (~10s)
2. `nfl_ollama_init` puxa llama3 → `success` (5-15 min)
3. `nfl_api`:
   - `[ML] Iniciando treinamento...` → download nfl_data_py → CV XGBoost (5-15 min)
   - `[RAG] Indexando...` → sentence-transformers download → 14 docs indexados
   - `[API] Subindo FastAPI...` → uvicorn :8000 pronto
4. `nfl_dashboard` → npm install → Vite dev server :5173

**Critério de saída da Fase 2:**
- `docker compose ps` mostra os 4 serviços rodando (ollama, ollama-init exited 0, backend, frontend)
- `curl http://localhost:8000/health` retorna `{"status":"ok"}`
- `curl http://localhost:5173` retorna HTML

### Fase 3 — Smoke Tests

Executados em sequência. Falha em qualquer passo → para, diagnostica, conserta, refaz só esse passo.

#### 3.1 Backend (curl direto)

| # | Endpoint | O que valida | Resposta esperada |
|---|---|---|---|
| 1 | `GET /health` | API viva | `{"status":"ok"}` |
| 2 | `GET /` | Root | módulos listados |
| 3 | `GET /ml/teams` | NFL data + modelo | array com 32 times, EPA preenchido |
| 4 | `GET /ml/matchup/KC/SF` | XGBoost predição | `home_win_probability` numérico |
| 5 | `GET /ml/model-info` | Métricas do modelo | accuracy + ROC-AUC |
| 6 | `GET /rag/status` | ChromaDB | `documents_indexed >= 14` |
| 7 | `POST /rag/chat` `{"question":"o que é EPA?"}` | Ollama + RAG | `answer` não vazio + `sources >= 1` |
| 8 | `POST /agent/ask` `{"question":"compara KC e SF"}` | Agent + tool calling | `answer` + `tools_used` não vazio |
| 9 | `GET /vision/formations/data` | PBP analisado | `formations` array |
| 10 | `GET /vision/formations/diagram/Shotgun%20Pro%20Set` | matplotlib | `image_base64` não vazio |
| 11 | `POST /vision/analyze-image` (PNG fake) | OpenCV | `circles_detected` numérico |

#### 3.2 Frontend (browser em http://localhost:5173)

| # | Página | O que validar |
|---|---|---|
| 1 | `/` Dashboard | Ranking de times carrega, hot-seat funciona, model info aparece |
| 2 | `/matchup` | Selecionar 2 times → radar chart aparece |
| 3 | `/encyclopedia` | Página renderiza sem erro |
| 4 | `/chat` | Mandar pergunta, receber resposta com source badges |
| 5 | `/agent` | Mandar pergunta, ver cadeia de raciocínio expansível |
| 6 | `/vision` | Tab "EPA por Formação" carrega gráficos; tab "Diagramas" mostra imagens; tab "Upload" aceita arquivo |

**Critério de saída da Fase 3:** todos os passos com ✓ ou com ✗ + fix aplicado + ✓ no retry.

### Fase 4 — Atualização do README

Trocar status nos 4 módulos:
- ✅ Módulo 1 — ML (já estava)
- ~~🚧~~ → ✅ Módulo 2 — RAG
- ~~🚧~~ → ✅ Módulo 3 — Agent
- ~~🚧~~ → ✅ Módulo 4 — Vision

Adicionar seção "Como rodar (Docker)" se ainda não tiver explícito.

### Fase 5 — Entregáveis

1. ✅ `docker compose up` funciona do zero
2. ✅ Smoke tests com evidência (comandos executados + outputs reais)
3. ✅ `README.md` atualizado
4. 📝 Este design doc + appendix com falhas/fixes encontrados na execução

## Protocolo de Falha

1. **Triagem (3 perguntas):**
   - Container subiu (`docker ps`)?
   - Healthcheck passou?
   - Log mostra erro claro?
2. **Diagnóstico:** ler stack trace específico, não chutar.
3. **Fix mínimo:** sem refactor, sem cleanup adjacente.
4. **Validação:** refazer só o teste que falhou.
5. **Documentar:** anotar falha + fix no appendix deste doc.

**Política fix vs ask:**
- **Fix direto:** line endings, dependência Python quebrada, typo, env var faltando, line ending de script.
- **Perguntar antes:** mudar versão de modelo (llama3 → llama3.1), trocar arquitetura, mudar API contract, deletar volume.

## Riscos & Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| `entrypoint.sh` com CRLF (Windows git autocrlf) | Alta | Fix na Fase 1 |
| `nfl_data_py` falha em baixar dados | Média | Retry, ou ajustar `nfl_seasons` no `.env` |
| llama3 download falha no meio | Média | Volume `ollama_data` persiste; reexecutar `ollama-init` |
| Docker Desktop sem RAM suficiente | Média | Aviso prévio, recomendar 8GB+ |
| Tool calling do llama3 inconsistente (formato JSON) | Média | Código já tem fallback (`_generate_fallback_response`) |
| Porta ocupada | Baixa | Detecção na Fase 1 |

## Decisões em Aberto

Nenhuma — escopo travado em "fazer rodar e testar o que existe".

## Apêndice — Falhas e Fixes

### Execução em 2026-04-28 (concluída em 2026-04-29 ~02h BRT)

**Ambiente:** Windows 11 + Docker Desktop 29.4.1 + Git Bash. 16 cores, 15.6 GB RAM, 484 GB livre em D:.

#### Fase 1 — Pre-flight Environment
- ✓ Docker daemon ativo
- ✓ CPU/RAM suficientes
- ✓ Portas 5173, 8000 livres
- ⚠ **Porta 11434 ocupada**: usuário tinha Ollama nativo rodando (`C:\Users\User\AppData\Local\Programs\Ollama\ollama.exe`, PID 7516). Já tinha `llama3:latest` (4.6GB) baixado.
  - **Decisão:** opção B do plano de fallback — manter Ollama nativo, apontar backend pra ele via `host.docker.internal`. Economizou ~4GB de re-download.
  - **Fix aplicado em `docker-compose.yml`:** removidos serviços `ollama` e `ollama-init`; adicionado `extra_hosts: host.docker.internal:host-gateway`; mudado `OLLAMA_BASE_URL=http://host.docker.internal:11434`.

#### Fase 2 — Pre-flight Code
- ✓ `entrypoint.sh` com LF puro (0 caracteres CR detectados via `od -c | grep -c '\r'`)
- ✓ Permissão executável tratada pelo Dockerfile (`chmod +x /entrypoint.sh`)

#### Fase 3 — Build
- Build em cache (imagens já existiam de tentativa anterior). Tempo: ~30s. Sem erros.
- Após fix de `requirements.txt` (próxima fase), rebuild durou ~3 min.

#### Fase 4 — Bringup (3 falhas → 3 fixes)

**Falha 1: `nfl_data_py==0.1.5` não baixava dados de 2022/2023/2024**
- **Sintoma:** `Data not available for 2022/2023/2024` durante `_load_or_fetch`. Cache vazio era salvo no volume, container entrava em restart loop com `KeyError: 'pass'` em `features.py:44`.
- **Diagnóstico:** versão 0.1.5 (de 2022) é incompatível com a infra atual do `nflverse-data` que migrou pra parquet.
- **Fix:** `requirements.txt`: `nfl_data_py==0.1.5` → `nfl_data_py==0.3.3`.
- **Validado:** teste em container ad-hoc retornou 49.492 linhas/397 colunas pra 2024 sozinho.

**Falha 2: Conflito pandas 2.2.2 vs nfl_data_py 0.3.3**
- **Sintoma:** `pip install` falhou com `ResolutionImpossible`. `nfl_data_py 0.3.3` quer `pandas<2.0`.
- **Fix:** `requirements.txt`:
  - `pandas==2.2.2` → `pandas>=1.5.3,<2.0`
  - `numpy==1.26.4` → `numpy>=1.23,<2.0`
- **Validado:** rebuild do backend bem-sucedido.

**Falha 3: Volumes Docker com cache corrompido após primeira tentativa**
- **Sintoma:** mesmo após mudar `nfl_data_py`, o container ainda lia o `pbp_2022_2023_2024.pkl` vazio do volume (358 bytes) e quebrava no mesmo lugar.
- **Fix:** `docker compose down -v` (com autorização do usuário) → recriou volumes vazios → próximo bringup baixou dados frescos.
- **Resultado:** 148.591 jogadas baixadas, 854 jogos no calendário, modelo XGBoost treinado e salvo, ChromaDB indexado com 15 docs.

#### Fase 5 — Smoke Tests Backend (3 falhas → 3 fixes)

**Falha 4: `/ml/model-info` retornava 500**
- **Sintoma:** `ValueError: 'numpy.float32' object is not iterable` durante serialização FastAPI.
- **Diagnóstico:** o `.pkl` do XGBoost contém `numpy.float32` no `feature_importance`, e FastAPI/jsonable_encoder não lida.
- **Fix:** `ml/predictor.py` — adicionada função `_to_jsonable()` que converte `np.floating`, `np.integer`, `np.ndarray` recursivamente; `load_model_metrics()` passou a aplicar essa conversão.
- **Validado:** endpoint retorna `accuracy: 0.6074`, `roc_auc: 0.6319`, `cv_roc_auc_mean: 0.6636`, `feature_importance: {...}` com floats puros.

**Falha 5: `llama3` não suporta tool calling**
- **Sintoma:** `/agent/ask` retornava 400 do Ollama: `registry.ollama.ai/library/llama3:latest does not support tools`.
- **Diagnóstico:** o modelo base `llama3` (8B, 2024-04) não foi treinado para function/tool calling. Função foi introduzida no `llama3.1`.
- **Fix:** `ollama pull llama3.1` (4.9 GB) + `OLLAMA_MODEL=llama3.1` em `docker-compose.yml` e `.env` + restart do backend.
- **Validado:** tool calling funcional, agent responde em PT-BR usando ferramentas.

**Falha 6: llama3.1 retorna args de tools como string ao invés de int**
- **Sintoma:** `/agent/ask` retornava `Erro no agente: slice indices must be integers or None or have an __index__ method`. Llama3.1 mandava `top_n: "1"` (string) apesar do schema dizer `integer`.
- **Diagnóstico:** comportamento conhecido de modelos open-source com tool calling; o tipo do JSON vai como string.
- **Fix:** `agent/tools.py` — coerção defensiva `int(top_n)` em `_get_team_rankings`, `int(last_games)` em `_check_qb_hot_seat`. Tipos das funções afrouxados (`top_n=5` ao invés de `top_n: int = 5`).
- **Validado:** agent retornou "BAL com EPA 0.2027 é o melhor ataque" em 2.7s, com `tools_used=['get_team_rankings']`, `iterations=2`.

#### Resultados finais

**Backend smoke tests:** 11/11 ✓
| # | Endpoint | Status |
|---|---|---|
| 5.1 | `GET /health` | ✓ |
| 5.2 | `GET /` | ✓ |
| 5.3 | `GET /ml/teams` | ✓ (32 times) |
| 5.4 | `GET /ml/matchup/KC/SF` | ✓ (KC 79.1%) |
| 5.5 | `GET /ml/model-info` | ✓ após fix #4 |
| 5.6 | `GET /rag/status` | ✓ (15 docs) |
| 5.7 | `POST /rag/chat` | ✓ após warmup do llama3.1 |
| 5.8 | `POST /agent/ask` | ✓ após fixes #5 e #6 |
| 5.9 | `GET /vision/formations/data` | ✓ (36.725 jogadas) |
| 5.10 | `GET /vision/formations/diagram/...` | ✓ (PNG 40k bytes) |
| 5.11 | `POST /vision/analyze-image` | ✓ (7 círculos detectados) |

**Frontend smoke tests:** 6/6 ✓ (validados pelo usuário no browser)

#### Observações fora de escopo (oportunidades futuras)

- **RAG em inglês**: llama3.1 às vezes ignora o prompt PT-BR no `/rag/chat`. Mitigação possível: reforçar system prompt + few-shot examples.
- **Telemetria do ChromaDB**: warnings inofensivos no log: `Failed to send telemetry event ClientStartEvent: capture() takes 1 positional argument but 3 were given`. Sem impacto funcional.
- **README desatualizado** (referenciava LangGraph e YOLOv8): atualizado na Task 7.
- **Conflito de merge git**: durante a Task 7 o README apresentava marcadores `<<<<<<< HEAD ... >>>>>>> cdb0430...`. Resolvido via Write completo. Origem desconhecida (provável git pull externo durante a sessão).

#### Métricas

- **Tempo total de execução**: ~2h (com pausas pra decisões do usuário)
- **Tempo de bringup do zero**: ~6 min após fixes (148k linhas baixadas + 1m treino + ingest)
- **Modificações em código**: 5 arquivos
  - `docker-compose.yml` — Ollama nativo + extra_hosts
  - `backend/requirements.txt` — nfl_data_py + pandas pin
  - `backend/ml/predictor.py` — `_to_jsonable()` helper
  - `backend/agent/tools.py` — coerção de int em 2 tools
  - `.env` — `OLLAMA_MODEL=llama3.1`
- **Modificações em docs**: 2 arquivos (`README.md`, este apêndice)

---
