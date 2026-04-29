# Docker Bringup & Smoke Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer todos os 4 serviços Docker (ollama, ollama-init, backend, frontend) ao ar pela primeira vez na máquina do usuário, validar via smoke tests ponta-a-ponta os 4 módulos da aplicação, corrigir falhas que aparecerem, e atualizar o README pra refletir o estado real.

**Architecture:** Não há mudança arquitetural — o `docker-compose.yml` já define o grafo de serviços com healthchecks e volumes persistentes. O plano executa um audit estático (Fase 1), bringup com volumes vazios (Fase 2), e smoke tests sequenciais (Fase 3) com fix-as-you-go.

**Tech Stack:** Docker Compose v2, Ollama (llama3), FastAPI 0.111, ChromaDB 0.5.3, sentence-transformers 3.0.1, langchain-ollama 0.1.1, XGBoost 2.0.3, React 18 + Vite 5 + Recharts, OpenCV 4.10, matplotlib 3.9.

**Spec:** `docs/superpowers/specs/2026-04-28-docker-bringup-design.md`

**Plataforma alvo:** Windows 11 + Docker Desktop. Bash via Git Bash. Comandos usam syntax Unix.

**Working directory:** `d:/AI Solution/NFL-Analytics/`

---

## File Structure

Mudanças que este plano produz:

| Arquivo | Tipo | Razão |
|---|---|---|
| `backend/entrypoint.sh` | Modify (condicional) | Reescrever com LF se CRLF detectado |
| `README.md` | Modify | Status dos módulos 2/3/4: 🚧 → ✅ |
| `docs/superpowers/specs/2026-04-28-docker-bringup-design.md` | Append | Apêndice com falhas + fixes encontrados |

Todo resto do código fica intocado — só é modificado se um smoke test falhar e exigir patch específico.

---

## Task 1: Pre-flight Environment Audit

**Files:**
- Read-only: nenhum arquivo modificado nesta task

**Goal:** confirmar que Docker Desktop tá ligado, portas livres, recursos OK. Falha aqui significa "nem tenta subir".

- [ ] **Step 1.1: Verificar Docker daemon ativo**

Run:
```bash
docker version --format '{{.Server.Version}}'
```
Expected: versão do server aparece (ex: `27.x.x`). Se erro `Cannot connect to the Docker daemon`, **pare** e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 1.2: Checar recursos do Docker Desktop**

Run:
```bash
docker info --format 'CPU: {{.NCPU}} / RAM: {{.MemTotal}} bytes / Storage: {{.Driver}}'
```
Expected: RAM em bytes — converter para GB: dividir por 1073741824. Mínimo recomendado: **8 GB**. Se < 8GB, avisar usuário pra ajustar Docker Desktop → Settings → Resources antes de continuar.

- [ ] **Step 1.3: Confirmar portas 5173, 8000, 11434 livres**

Run (Windows, via PowerShell tool):
```powershell
Get-NetTCPConnection -LocalPort 5173,8000,11434 -ErrorAction SilentlyContinue | Select-Object LocalPort,State,OwningProcess
```
Expected: nenhum resultado (silêncio = portas livres). Se aparecer alguma porta com state `Listen`, identificar o processo via:
```powershell
Get-Process -Id <OwningProcess> | Select-Object Id,Name
```
Avisar o usuário e pedir pra encerrar o conflito (não vou tentar matar processo dele).

- [ ] **Step 1.4: Confirmar disco livre suficiente**

Run:
```bash
df -h /d 2>/dev/null || echo "use Get-PSDrive D"
```
Ou via PowerShell:
```powershell
Get-PSDrive D | Select-Object Used,Free
```
Expected: pelo menos **15 GB livres** em D:\. Se menos, avisar.

---

## Task 2: Pre-flight Code Audit

**Files:**
- Modify (condicional): `backend/entrypoint.sh`

**Goal:** detectar e corrigir o problema mais comum em Windows + bash: CRLF em `entrypoint.sh` que faz o container backend morrer com erro tipo `/usr/bin/env: 'bash\r': No such file or directory`.

- [ ] **Step 2.1: Verificar line endings de `backend/entrypoint.sh`**

Run:
```bash
file "d:/AI Solution/NFL-Analytics/backend/entrypoint.sh"
```
Or:
```bash
od -c "d:/AI Solution/NFL-Analytics/backend/entrypoint.sh" | head -2 | grep -c '\\r'
```
Expected:
- Saída do `file` deve ser `Bourne-Again shell script, ASCII text executable` (sem `with CRLF line terminators`).
- Saída do `grep -c '\\r'` deve ser `0`.

Se houver `\r` no output → ir para Step 2.2. Senão, **pular** para Task 3.

- [ ] **Step 2.2: Reescrever `entrypoint.sh` com LF puro (somente se Step 2.1 falhou)**

Use a tool `Read` para ler `backend/entrypoint.sh`, depois `Write` para reescrever com o mesmo conteúdo (a tool `Write` da Claude Code escreve com LF natural).

Verificar de novo:
```bash
od -c "d:/AI Solution/NFL-Analytics/backend/entrypoint.sh" | head -2 | grep -c '\\r'
```
Expected: `0`

- [ ] **Step 2.3: Confirmar permissão executável**

Não aplicável diretamente em Windows host (NTFS), mas o `Dockerfile` faz `chmod +x /entrypoint.sh` durante o build. Validação: ler o Dockerfile e confirmar que a linha `RUN chmod +x /entrypoint.sh` existe (já está em `backend/Dockerfile:25`).

---

## Task 3: Build Docker Images

**Files:**
- Read-only: nenhum arquivo modificado.

**Goal:** Construir as imagens `nfl-analytics-backend` e `nfl-analytics-frontend`. Esta etapa baixa as base images Python 3.11 e Node 20, instala dependências Python (pesado: torch via sentence-transformers, opencv) e roda `npm install`. Tempo esperado: **5-15 min**.

- [ ] **Step 3.1: Build em paralelo**

Run (no working dir `d:/AI Solution/NFL-Analytics/`):
```bash
docker compose build 2>&1 | tee /tmp/docker-build.log
```
(no Windows: `tee` via Git Bash funciona; alternativa: redirect simples `> build.log 2>&1`)

Expected (sucesso):
- Mensagem final `[+] Building <duração> (<N>/<M>) FINISHED`
- Sem `ERROR` no log

Se falhar: ler o erro específico no log. Causas comuns:
- `pip install` quebrando em algum pacote → ver Step 3.2
- `npm install` quebrando → ver Step 3.3
- Sem internet → avisar usuário

- [ ] **Step 3.2: Fix de build do backend (somente se Step 3.1 falhou no estágio Python)**

Diagnóstico:
```bash
grep -A 5 "ERROR" /tmp/docker-build.log | head -30
```

Casos típicos e fixes:
| Sintoma | Fix |
|---|---|
| `chromadb` ou `onnxruntime` falha de build | Adicionar `RUN pip install --upgrade pip wheel setuptools` ao `backend/Dockerfile` antes do `RUN pip install -r requirements.txt` |
| `nfl_data_py` requer `lxml` system | `apt-get install -y libxml2-dev libxslt1-dev` no Dockerfile |
| Conflito de versão pinada | NÃO subir versões de cabeça; documentar no apêndice e resolver no menor delta possível |

Após fix, rodar `docker compose build backend` e seguir só se o erro sumir.

- [ ] **Step 3.3: Fix de build do frontend (somente se Step 3.1 falhou no estágio Node)**

```bash
grep -A 5 "ERROR" /tmp/docker-build.log | grep -i "npm\|node" | head -20
```

Casos típicos:
- `EACCES`/`EPERM` em volume — não acontece no build, só em runtime; ignorar aqui.
- Falta de pacote npm → não devia acontecer, `package.json` é estável.

Após fix, `docker compose build frontend`.

- [ ] **Step 3.4: Confirmar imagens criadas**

```bash
docker images | grep nfl-analytics
```
Expected: 2 imagens (`nfl-analytics-backend` e `nfl-analytics-frontend`) com tag `latest`.

---

## Task 4: Stack Bringup

**Files:**
- Read-only.

**Goal:** Subir os 4 serviços com volumes vazios. Esperar o `ollama-init` baixar llama3 (~4GB), o backend treinar XGBoost + indexar ChromaDB, e o frontend subir o Vite. Tempo esperado: **15-40 min** dependendo de internet.

- [ ] **Step 4.1: Subir o stack em background**

Run:
```bash
docker compose up -d
```
Expected:
```
[+] Running 5/5
 ✔ Network nfl-analytics_default       Created
 ✔ Container nfl_ollama                Started
 ✔ Container nfl_ollama_init           Started
 ✔ Container nfl_api                   Started
 ✔ Container nfl_dashboard             Started
```

- [ ] **Step 4.2: Acompanhar o ollama-init até completar**

```bash
docker logs -f nfl_ollama_init
```
(use Bash com `run_in_background=true` se quiser polling em outra task)

Expected (no fim):
```
[INIT] Modelo llama3 pronto!
```
E o container exitar com code 0.

Confirmar:
```bash
docker compose ps nfl_ollama_init --format "{{.State}}"
```
Expected: `exited`

Se ficar travado em "pulling manifest" por > 5 min sem progresso, reiniciar:
```bash
docker compose restart ollama-init
```

- [ ] **Step 4.3: Acompanhar o backend até a API estar pronta**

```bash
docker logs -f nfl_api 2>&1 | head -200
```

Marcos esperados (em ordem):
1. `[ML] Modelo não encontrado. Iniciando treinamento...`
2. download de play-by-play (várias linhas `Downloading season YYYY data...`)
3. `[ML] ✓ Treinamento concluído!`
4. `[RAG] Indexando documentos no ChromaDB...`
5. `[RAG] ✓ <N> documentos indexados.`
6. `[API] Subindo FastAPI...`
7. `Uvicorn running on http://0.0.0.0:8000`

Tempo total: 5-15 min (sem cache).

Se falhar em ML training: ver `nfl_data_py` connection issues ou tweak de seasons em `.env`.
Se falhar em RAG ingest: pode ser sentence-transformers download travado — esperar mais ou reiniciar com `docker compose restart backend`.

- [ ] **Step 4.4: Healthcheck do backend**

```bash
curl -sf http://localhost:8000/health
```
Expected: `{"status":"ok"}`

Se `Connection refused`, esperar mais 30s e tentar de novo. Se persistir > 2 min após "Uvicorn running" no log, investigar via `docker logs nfl_api --tail 50`.

- [ ] **Step 4.5: Healthcheck do frontend**

```bash
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:5173
```
Expected: `200`

Se 502/connection refused: `docker logs nfl_dashboard --tail 50` — provável `npm install` ainda rolando. Esperar.

- [ ] **Step 4.6: Confirmar todos os containers em estado correto**

```bash
docker compose ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}"
```
Expected:
```
SERVICE         STATE      STATUS
backend         running    Up X minutes (healthy)
frontend        running    Up X minutes
ollama          running    Up X minutes (healthy)
ollama-init     exited     Exited (0) X minutes ago
```

---

## Task 5: Backend Smoke Tests

**Files:**
- Read-only no código. Falhas aqui podem disparar fixes em endpoints específicos (Task 5.X.fix).

**Goal:** Validar cada endpoint dos 4 módulos via curl direto na API.

- [ ] **Step 5.1: `GET /health`**

```bash
curl -s http://localhost:8000/health | python -m json.tool
```
Expected:
```json
{"status": "ok"}
```

- [ ] **Step 5.2: `GET /` (root)**

```bash
curl -s http://localhost:8000/ | python -m json.tool
```
Expected: JSON com chaves `status`, `docs`, `modules` (4 módulos listados).

- [ ] **Step 5.3: `GET /ml/teams`**

```bash
curl -s http://localhost:8000/ml/teams | python -m json.tool | head -30
```
Expected: array com 32 objetos. Cada um com `team`, `off_epa`, `def_epa`, `off_pass_epa`, etc. Valores numéricos preenchidos.

- [ ] **Step 5.4: `GET /ml/matchup/KC/SF`**

```bash
curl -s http://localhost:8000/ml/matchup/KC/SF | python -m json.tool
```
Expected: JSON com `home_team`, `away_team`, `home_win_probability` (entre 0 e 1), `insight`, `radar`.

- [ ] **Step 5.5: `GET /ml/model-info`**

```bash
curl -s http://localhost:8000/ml/model-info | python -m json.tool
```
Expected: `accuracy`, `roc_auc`, `cv_roc_auc_mean`, `training_samples` numéricos.

- [ ] **Step 5.6: `GET /rag/status`**

```bash
curl -s http://localhost:8000/rag/status | python -m json.tool
```
Expected: `documents_indexed >= 14`, `ready: true`, `model: "llama3 ..."`.

- [ ] **Step 5.7: `POST /rag/chat` (não-streaming)**

```bash
curl -s -X POST http://localhost:8000/rag/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é EPA?","history":[],"n_docs":3}' | python -m json.tool
```
Expected: `answer` em português, não-vazio (>50 chars), `sources` com pelo menos 1 item, `model: "llama3"`.

Tempo: 5-30s (Ollama é local). Se timeout ou erro `connection refused` no Ollama:
```bash
docker logs nfl_ollama --tail 20
```
Verificar se o modelo está carregado.

- [ ] **Step 5.8: `POST /agent/ask`**

```bash
curl -s -X POST http://localhost:8000/agent/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Qual time tem o melhor ataque da liga? Use a ferramenta de ranking.","history":[]}' | python -m json.tool | head -80
```
Expected: `answer`, `steps` (lista com tipos `thinking`/`tool_call`/`tool_result`/`answer`), `tools_used` com pelo menos 1 ferramenta. Se `ollama_available: false` aparecer, é o fallback — investigar Ollama.

Llama3 pode falhar em fazer tool calling consistente. Se `tools_used` ficar vazio, tentar reformular a pergunta de forma mais explícita.

- [ ] **Step 5.9: `GET /vision/formations/data`**

```bash
curl -s "http://localhost:8000/vision/formations/data" | python -m json.tool | head -40
```
Expected: `total_plays` numérico, `formations` array, `chart` com `labels`/`epa`/`usage`/`plays`/`success_rate` arrays do mesmo tamanho.

- [ ] **Step 5.10: `GET /vision/formations/diagram/Shotgun%20Pro%20Set`**

```bash
curl -s "http://localhost:8000/vision/formations/diagram/Shotgun%20Pro%20Set" | python -c "import sys,json; d=json.load(sys.stdin); print('formation:', d['formation']); print('image_base64_len:', len(d['image_base64'])); print('mime:', d['mime_type'])"
```
Expected: `formation: Shotgun Pro Set`, `image_base64_len > 5000`, `mime: image/png`.

- [ ] **Step 5.11: `POST /vision/analyze-image` com PNG dummy**

Gerar PNG mínimo com Python:
```bash
python -c "
import base64, io
from PIL import Image, ImageDraw
img = Image.new('RGB', (400, 300), 'green')
draw = ImageDraw.Draw(img)
for x, y in [(100,100),(200,100),(300,100),(150,200),(250,200)]:
    draw.ellipse([x-15,y-15,x+15,y+15], fill='white', outline='black')
img.save('/tmp/test_formation.png')
print('saved')
"
curl -s -X POST http://localhost:8000/vision/analyze-image \
  -F "file=@/tmp/test_formation.png" | python -m json.tool
```
Expected: `circles_detected >= 3`, `formation_estimate` string não-vazia, `confidence` string.

Se `Pillow` não estiver disponível no host: substituir por upload de qualquer PNG que o usuário tenha em mãos, ou pular este passo e marcar como manual.

---

## Task 6: Frontend Smoke Tests

**Files:**
- Read-only.

**Goal:** Cada página do React renderiza e consome a API. Validação manual no browser (`http://localhost:5173`). Cada step lista o que clicar e o que ver.

> **Como ajudar o usuário:** A cada step, dizer "abra a URL X no browser e confirme Y". Se Y falhar, peço screenshot ou copia do console error. Não tenho como automatizar browser daqui.

- [ ] **Step 6.1: Dashboard (`/`)**

Abrir: `http://localhost:5173/`

Verificar:
- 4 cards no topo (Melhor Ataque, Melhor Defesa, Média da Liga, Times Analisados) preenchidos
- Gráfico "Ranking de Eficiência" mostra 32 barras horizontais (uma por time)
- Botões "⚔ Ataque" / "🛡 Defesa" trocam o sort
- Bloco "Berlinda do QB" carrega para o time KC (default)
- Card "Modelo XGBoost" no rodapé com accuracy/ROC-AUC

Se branco/erro: F12 → Console → copiar primeiro erro.

- [ ] **Step 6.2: Matchup (`/matchup`)**

Abrir: `http://localhost:5173/matchup`

Verificar:
- Página renderiza com seleção de times
- Selecionar 2 times (ex: KC vs SF) → radar chart aparece com probabilidades

- [ ] **Step 6.3: Encyclopedia (`/encyclopedia`)**

Abrir: `http://localhost:5173/encyclopedia`

Verificar: página renderiza sem erro de JS no console. Conteúdo estático ou dinâmico — qualquer um aceita.

- [ ] **Step 6.4: Chat (`/chat`)**

Abrir: `http://localhost:5173/chat`

Verificar:
- Header com "X docs indexados" (X >= 14)
- 6 botões de sugestões aparecem
- Clicar em "O que é EPA e como é calculado?"
- Resposta do AI aparece em 5-30s, com badges de fontes embaixo

- [ ] **Step 6.5: Agent (`/agent`)**

Abrir: `http://localhost:5173/agent`

Verificar:
- Tags das 5 ferramentas aparecem no topo
- Sugestões clicáveis
- Clicar em "Quem vai ganhar: KC em casa contra SF?"
- Resposta vem com cadeia de raciocínio expansível (clicar pra abrir)
- "tools_used" lista pelo menos 1 ferramenta

- [ ] **Step 6.6: Vision (`/vision`)**

Abrir: `http://localhost:5173/vision`

Verificar 3 tabs:
- **EPA por Formação**: filtro de times + 2 gráficos de barras + insight
- **Diagramas de Campo**: lista de formações + diagrama PNG renderiza
- **Analisar Imagem**: drop zone funcional, upload de PNG retorna análise

---

## Task 7: README Update

**Files:**
- Modify: `README.md` (linhas 38-58, seção "🧠 Módulos do Projeto")

**Goal:** Trocar status dos módulos 2/3/4 de 🚧 para ✅ e ajustar texto.

- [ ] **Step 7.1: Trocar Módulo 2 (RAG)**

Edit `README.md`:
- Old:
```
### 🚧 Módulo 2 — LLM + RAG (Ollama)
```
- New:
```
### ✅ Módulo 2 — LLM + RAG (Ollama)
```

- [ ] **Step 7.2: Trocar Módulo 3 (Agent)**

Edit `README.md`:
- Old:
```
### 🚧 Módulo 3 — Agente de IA (LangGraph)
```
- New:
```
### ✅ Módulo 3 — Agente de IA (Ollama Tool Calling)
```

(Razão da mudança no parêntese: o código atual usa httpx direto pro Ollama com tool calling, não LangGraph. Honestidade.)

- [ ] **Step 7.3: Trocar Módulo 4 (Vision)**

Edit `README.md`:
- Old:
```
### 🚧 Módulo 4 — Visão Computacional
- Detecção de formações táticas (YOLOv8)
- Classificação de esquemas ofensivos/defensivos
```
- New:
```
### ✅ Módulo 4 — Visão Computacional
- Análise de EPA por formação a partir de play-by-play
- Geração de diagramas de campo (matplotlib)
- Detecção de jogadores em imagens com OpenCV (HoughCircles)
```

(YOLOv8 não foi implementado — descrição honesta do que existe.)

- [ ] **Step 7.4: Atualizar tabela "Stack Técnica"**

Trocar linha do Agente:
- Old: `| Agente | LangGraph |`
- New: `| Agente | Ollama Tool Calling (httpx) |`

Trocar linha de Visão:
- Old: `| Visão | OpenCV, YOLOv8 |`
- New: `| Visão | OpenCV, matplotlib |`

---

## Task 8: Document Findings in Spec Appendix

**Files:**
- Append: `docs/superpowers/specs/2026-04-28-docker-bringup-design.md` (seção "Apêndice — Falhas e Fixes")

**Goal:** Registrar tudo que foi descoberto e corrigido durante a execução, pra histórico.

- [ ] **Step 8.1: Listar fixes aplicados**

Ler o spec atual e localizar a seção `## Apêndice — Falhas e Fixes`. Substituir o placeholder por entradas no formato:

```markdown
### Execução em 2026-04-28

#### Fase 1 — Pre-flight
- ✓ Docker daemon ativo (versão X.Y.Z)
- ✓ Recursos: N CPUs, M GB RAM
- ✓ Portas livres
- ✓ Disco livre OK

#### Fase 2 — Code Audit
- (Se entrypoint.sh tinha CRLF) **Fix:** reescrito com LF puro. Sintoma seria `bash\r: No such file...` no log do container. Detectado via `od -c | grep '\\r'`.

#### Fase 3 — Build
- Tempo total: X min
- (Quaisquer ajustes no Dockerfile ou requirements)

#### Fase 4 — Bringup
- llama3 download: X min
- Backend training: Y min
- RAG ingest: <N> docs

#### Fase 5 — Smoke Tests
- 11/11 backend OK
- 6/6 frontend OK
- (Falhas e fixes específicos)

#### Status final
- ✓ Tudo funcionando
- ou: ⚠ X falhas conhecidas: Y, Z
```

Preencher com dados reais da execução.

- [ ] **Step 8.2: Atualizar Status no header do spec**

Mudar `**Status:** Aprovado, aguardando execução` para `**Status:** Executado em 2026-04-28 — <PASS|PARCIAL|FAIL>`.

---

## Self-Review

Antes de declarar o plano pronto, releio contra o spec:

**Spec coverage:**
- ✅ Spec § 1 (Pre-flight Audit) → Tasks 1 + 2
- ✅ Spec § 2 (Bringup Flow) → Tasks 3 + 4
- ✅ Spec § 3 (Smoke Tests) → Tasks 5 + 6
- ✅ Spec § 4 (Protocolo de Falha) → distribuído em "fix se falhou" de cada task
- ✅ Spec § 5 (Entregáveis) → Tasks 7 + 8

**Placeholder scan:**
- ✅ Sem TBD/TODO em steps acionáveis
- ✅ Comandos exatos em todo step de execução
- ✅ Outputs esperados explícitos

**Type consistency:**
- N/A — não há código novo sendo definido aqui, apenas comandos e validações.

**Falhas que poderiam virar tasks novas:**
- Se Ollama tool calling falhar consistentemente → ainda dentro do escopo "fazer rodar"; o código tem fallback (`_generate_fallback_response`).

Plano completo.

---
