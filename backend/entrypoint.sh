#!/bin/bash
# ─────────────────────────────────────────────────────────────────
#  NFL Analytics — Backend Entrypoint
#  Executado toda vez que o container inicia.
#  Inicializa ML e RAG antes de subir a API.
# ─────────────────────────────────────────────────────────────────
set -e

echo ""
echo "════════════════════════════════════════"
echo "   NFL Analytics Lab — Backend Init"
echo "════════════════════════════════════════"

# ── 1. Treina o modelo de ML (só se não existir) ──────────────
if [ -f "models/win_predictor.pkl" ]; then
    echo "[ML] ✓ Modelo XGBoost já treinado. Pulando."
else
    echo "[ML] Modelo não encontrado. Iniciando treinamento..."
    echo "[ML] Isso pode levar 5-15 minutos na primeira vez (download dos dados da NFL)."
    python -m ml.train
    echo "[ML] ✓ Treinamento concluído!"
fi

# ── 2. Indexa a base de conhecimento no ChromaDB (RAG) ────────
echo "[RAG] Verificando base de conhecimento..."
python -c "
from rag.ingest import ingest_documents
result = ingest_documents()
print(f'[RAG] ✓ {result[\"documents\"]} documentos indexados.')
"

# ── 3. Inicia o servidor FastAPI ──────────────────────────────
echo ""
echo "[API] Subindo FastAPI..."
echo "[API] Documentação: http://localhost:8000/docs"
echo "════════════════════════════════════════"
echo ""

exec uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --reload-dir /app \
    --log-level info
