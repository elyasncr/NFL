# Docker Bringup & Smoke Test — NFL Analytics Lab

**Data:** 2026-04-28
**Autor:** Claude (Opus 4.7) + @mauryneto010
**Status:** Aprovado, aguardando execução

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

*(Preenchido durante execução. Cada entrada: timestamp, sintoma, diagnóstico, fix aplicado.)*

---
