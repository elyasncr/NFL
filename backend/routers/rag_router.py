"""
Módulo 2 — Endpoints RAG + LLM
================================
Chat em linguagem natural sobre NFL usando RAG com ChromaDB e Ollama.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from rag.ingest import ingest_documents, search_knowledge, get_indexed_count
from rag.retriever import generate_rag_response, generate_streaming_response

router = APIRouter(prefix="/rag", tags=["RAG + LLM"])


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []
    n_docs: int = 3


class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
    category: str | None = None


@router.get("/status")
def rag_status():
    count = get_indexed_count()
    return {
        "module": "RAG + LLM (Módulo 2)",
        "status": "ativo",
        "documents_indexed": count,
        "ready": count > 0,
        "model": "llama3 (Ollama local)",
        "embeddings": "all-MiniLM-L6-v2 (sentence-transformers)"
    }


@router.post("/ingest")
def ingest(force: bool = False):
    return ingest_documents(force=force)


@router.post("/chat")
async def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Pergunta não pode ser vazia.")
    return await generate_rag_response(
        question=request.question,
        history=request.history,
        n_docs=request.n_docs,
    )


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    if get_indexed_count() == 0:
        ingest_documents()
    context_docs = search_knowledge(request.question, n_results=request.n_docs)

    async def event_generator():
        import json
        sources = [{"title": d["metadata"]["title"], "category": d["metadata"]["category"], "similarity": d["similarity"]} for d in context_docs]
        yield f"data: {json.dumps({'type': 'sources', 'data': sources})}\n\n"
        async for chunk in generate_streaming_response(request.question, context_docs, request.history):
            yield f"data: {json.dumps({'type': 'text', 'data': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/search")
def search(request: SearchRequest):
    if get_indexed_count() == 0:
        ingest_documents()
    results = search_knowledge(query=request.query, n_results=request.n_results, category=request.category)
    return {"query": request.query, "results": results}


@router.get("/documents")
def list_documents():
    from rag.knowledge_base import NFL_DOCUMENTS
    return {"total": len(NFL_DOCUMENTS), "documents": [{"id": d["id"], "title": d["title"], "category": d["category"]} for d in NFL_DOCUMENTS]}
