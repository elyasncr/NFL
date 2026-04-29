"""
Módulo 2 — RAG Retriever
==========================
Combina busca semântica (ChromaDB) com geração de resposta (Ollama).
Produz respostas fundamentadas nos documentos da base de conhecimento.
"""
import httpx
import json
from rag.ingest import search_knowledge, ingest_documents, get_indexed_count
from config import settings


def ensure_indexed():
    """Garante que os documentos estão indexados antes de responder."""
    if get_indexed_count() == 0:
        ingest_documents()


def build_rag_prompt(question: str, context_docs: list[dict], history: list[dict] = None) -> list[dict]:
    """
    Monta o prompt final com contexto recuperado e histórico da conversa.
    """
    # Formata os documentos de contexto
    context_text = "\n\n---\n\n".join([
        f"[{doc['metadata']['title']}]\n{doc['content']}"
        for doc in context_docs
    ])

    system_prompt = f"""Você é o NFL Analytics Assistant — um especialista em futebol americano e ciência de dados aplicada à NFL.

Você tem acesso a uma base de conhecimento com regras, métricas avançadas (EPA, CPOE, Success Rate), 
táticas, formações e contexto das temporadas recentes.

CONTEXTO RECUPERADO (use como base para sua resposta):
{context_text}

INSTRUÇÕES:
- Responda em português brasileiro de forma clara e informativa
- Cite dados e métricas específicas quando disponíveis no contexto
- Se a pergunta envolve estatísticas da temporada atual, mencione que os dados estão disponíveis via API
- Se não souber algo com certeza, diga claramente
- Seja conciso mas completo
- Use analogias quando útil para explicar conceitos complexos"""

    messages = [{"role": "system", "content": system_prompt}]

    # Adiciona histórico se existir
    if history:
        for msg in history[-6:]:  # Últimas 3 trocas para não estourar o contexto
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": question})
    return messages


async def generate_rag_response(
    question: str,
    history: list[dict] = None,
    n_docs: int = 3,
    stream: bool = False,
) -> dict:
    """
    Pipeline RAG completo:
    1. Busca documentos relevantes no ChromaDB
    2. Monta prompt com contexto
    3. Gera resposta com Ollama

    Args:
        question: Pergunta do usuário
        history: Histórico da conversa [{"role": "user/assistant", "content": "..."}]
        n_docs: Número de documentos a recuperar
        stream: Se True, retorna generator para streaming

    Returns:
        dict com resposta e metadados
    """
    ensure_indexed()

    # 1. Busca semântica
    context_docs = search_knowledge(question, n_results=n_docs)

    if not context_docs:
        return {
            "answer": "Não encontrei documentos relevantes para esta pergunta na base de conhecimento.",
            "sources": [],
            "model": settings.ollama_model,
        }

    # 2. Monta prompt
    messages = build_rag_prompt(question, context_docs, history)

    # 3. Gera resposta com Ollama
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            answer = data["message"]["content"]

    except httpx.ConnectError:
        answer = (
            "⚠️ Ollama não está rodando localmente. "
            "Inicie com: `ollama serve` e depois `ollama pull llama3`\n\n"
            "**Contexto encontrado na base de conhecimento:**\n\n" +
            "\n\n".join([f"**{d['metadata']['title']}**: {d['content'][:300]}..." for d in context_docs])
        )
    except Exception as e:
        answer = f"Erro ao conectar com Ollama: {str(e)}"

    return {
        "answer": answer,
        "sources": [
            {
                "title": doc["metadata"]["title"],
                "category": doc["metadata"]["category"],
                "similarity": doc["similarity"],
                "excerpt": doc["content"][:200] + "...",
            }
            for doc in context_docs
        ],
        "model": settings.ollama_model,
        "docs_retrieved": len(context_docs),
    }


async def generate_streaming_response(question: str, context_docs: list[dict], history: list[dict] = None):
    """
    Generator para streaming de resposta do Ollama.
    Cada yield é um chunk de texto.
    """
    messages = build_rag_prompt(question, context_docs, history)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": 0.7}
                }
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            if content := chunk.get("message", {}).get("content", ""):
                                yield content
                            if chunk.get("done"):
                                break
                        except json.JSONDecodeError:
                            continue
    except httpx.ConnectError:
        yield "⚠️ Ollama não está rodando. Execute: `ollama serve && ollama pull llama3`"
