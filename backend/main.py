"""
NFL Analytics API
==================
Backend principal do projeto NFL Analytics.

Módulos:
- /ml   → Machine Learning (Módulo 1) ✅
- /rag  → RAG + LLM com Ollama (Módulo 2) 🚧
- /agent → Agente de IA com LangGraph (Módulo 3) 🚧
- /vision → Visão Computacional (Módulo 4) 🚧

Documentação interativa: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.ml_router import router as ml_router
from routers.rag_router import router as rag_router
from routers.agent_router import router as agent_router
from routers.vision_router import router as vision_router
from config import settings

app = FastAPI(
    title=settings.app_name,
    description="API de Analytics da NFL com ML, RAG, Agentes e Visão Computacional",
    version="1.0.0",
)

# CORS: permite que o frontend React acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registra os routers de cada módulo
app.include_router(ml_router)
app.include_router(rag_router)
app.include_router(agent_router)
app.include_router(vision_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "🏈 NFL Analytics API online!",
        "docs": "/docs",
        "modules": {
            "ml": "/ml — Machine Learning (ativo)",
            "rag": "/rag — RAG + LLM (em desenvolvimento)",
            "agent": "/agent — AI Agent (em desenvolvimento)",
            "vision": "/vision — Visão Computacional (em desenvolvimento)",
        }
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
