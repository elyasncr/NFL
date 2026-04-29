# ─────────────────────────────────────────────────────────────────
#  NFL Analytics Lab — Makefile
#  Atalhos para os comandos mais usados
#  Uso: make <comando>
# ─────────────────────────────────────────────────────────────────

.PHONY: help up down build logs ps clean train rag-ingest shell-backend shell-frontend

# Cores para output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RESET  := \033[0m

help: ## Mostra este menu de ajuda
	@echo ""
	@echo "$(GREEN)NFL Analytics Lab$(RESET) — Comandos disponíveis:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Desenvolvimento ──────────────────────────────────────────

up: ## Sobe todos os containers (dev com hot reload)
	@echo "$(GREEN)Subindo NFL Analytics Lab...$(RESET)"
	docker compose up -d
	@echo ""
	@echo "$(GREEN)✓ Serviços disponíveis:$(RESET)"
	@echo "  Dashboard:  http://localhost:5173"
	@echo "  API:        http://localhost:8000"
	@echo "  API Docs:   http://localhost:8000/docs"
	@echo "  Ollama:     http://localhost:11434"
	@echo ""
	@echo "$(YELLOW)Aguarde o backend inicializar (pode levar alguns minutos na 1ª vez).$(RESET)"
	@echo "Acompanhe com: make logs-backend"

down: ## Para todos os containers
	docker compose down

restart: ## Reinicia todos os containers
	docker compose restart

build: ## Reconstrói as imagens Docker
	docker compose build --no-cache

build-backend: ## Reconstrói só o backend
	docker compose build --no-cache backend

build-frontend: ## Reconstrói só o frontend
	docker compose build --no-cache frontend

ps: ## Lista containers e status
	docker compose ps

# ─── Logs ────────────────────────────────────────────────────

logs: ## Logs de todos os serviços
	docker compose logs -f

logs-backend: ## Logs do backend (FastAPI)
	docker compose logs -f backend

logs-frontend: ## Logs do frontend (Vite)
	docker compose logs -f frontend

logs-ollama: ## Logs do Ollama
	docker compose logs -f ollama

# ─── Inicialização ────────────────────────────────────────────

train: ## Treina o modelo ML (XGBoost) dentro do container
	@echo "$(GREEN)Treinando modelo XGBoost...$(RESET)"
	docker compose exec backend python -m ml.train

rag-ingest: ## Re-indexa a base de conhecimento no ChromaDB
	@echo "$(GREEN)Indexando documentos no ChromaDB...$(RESET)"
	docker compose exec backend python -c "from rag.ingest import ingest_documents; print(ingest_documents(force=True))"

ollama-pull: ## Puxa o modelo llama3 no Ollama
	@echo "$(GREEN)Baixando llama3...$(RESET)"
	docker compose exec ollama ollama pull llama3

ollama-list: ## Lista modelos disponíveis no Ollama
	docker compose exec ollama ollama list

# ─── Shells ──────────────────────────────────────────────────

shell-backend: ## Abre shell no container do backend
	docker compose exec backend bash

shell-frontend: ## Abre shell no container do frontend
	docker compose exec frontend sh

shell-ollama: ## Abre shell no container do Ollama
	docker compose exec ollama bash

# ─── Produção ────────────────────────────────────────────────

prod-up: ## Sobe em modo produção (nginx + build estático)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down: ## Para modo produção
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-build: ## Reconstrói para produção
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache

# ─── Limpeza ─────────────────────────────────────────────────

clean: ## Para containers e remove volumes (APAGA DADOS!)
	@echo "$(YELLOW)ATENÇÃO: Isso vai apagar dados, modelos e cache!$(RESET)"
	@read -p "Continuar? [y/N] " ans; [ "$$ans" = "y" ] && \
		docker compose down -v || echo "Cancelado."

clean-cache: ## Remove só o cache de dados NFL (mantém modelos)
	docker compose exec backend python -c "from data.loader import clear_cache; clear_cache()"

prune: ## Remove imagens e containers não utilizados
	docker system prune -f

# ─── Status ──────────────────────────────────────────────────

status: ## Mostra status detalhado de todos os serviços
	@echo "$(GREEN)=== Containers ===$(RESET)"
	@docker compose ps
	@echo ""
	@echo "$(GREEN)=== Volumes ===$(RESET)"
	@docker volume ls | grep nfl || echo "  Nenhum volume criado ainda."
	@echo ""
	@echo "$(GREEN)=== Health ===$(RESET)"
	@curl -sf http://localhost:8000/health && echo "  API: OK" || echo "  API: OFFLINE"
	@curl -sf http://localhost:11434/api/tags > /dev/null && echo "  Ollama: OK" || echo "  Ollama: OFFLINE"
	@curl -sf http://localhost:5173 > /dev/null && echo "  Frontend: OK" || echo "  Frontend: OFFLINE"
