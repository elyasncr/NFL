"""
Módulo 2 — Ingestão de Documentos (RAG)
=========================================
Carrega a base de conhecimento da NFL no ChromaDB usando embeddings locais.
Usa sentence-transformers para embeddings (sem precisar do Ollama).
"""
import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path
from config import settings
from rag.knowledge_base import get_all_documents_text


# Cliente ChromaDB persistente em disco
def get_chroma_client() -> chromadb.PersistentClient:
    Path(settings.chroma_db_dir).mkdir(exist_ok=True)
    return chromadb.PersistentClient(path=settings.chroma_db_dir)


def get_collection(client: chromadb.PersistentClient = None):
    """
    Retorna (ou cria) a collection NFL no ChromaDB.
    Usa sentence-transformers localmente para embeddings.
    """
    if client is None:
        client = get_chroma_client()

    # Modelo de embedding local (sem precisar do Ollama)
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"  # Pequeno, rápido, bom em português + inglês
    )

    collection = client.get_or_create_collection(
        name="nfl_knowledge",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    return collection


def ingest_documents(force: bool = False) -> dict:
    """
    Ingere todos os documentos da base de conhecimento no ChromaDB.

    Args:
        force: Se True, limpa e reindexa tudo. Se False, só adiciona novos.

    Returns:
        dict com status da operação.
    """
    client = get_chroma_client()

    if force:
        try:
            client.delete_collection("nfl_knowledge")
            print("[RAG] Collection apagada para re-indexação.")
        except Exception:
            pass

    collection = get_collection(client)

    # Verifica se já tem documentos
    existing_count = collection.count()
    documents = get_all_documents_text()

    if existing_count >= len(documents) and not force:
        return {
            "status": "already_indexed",
            "documents": existing_count,
            "message": f"{existing_count} documentos já indexados. Use force=True para re-indexar."
        }

    print(f"[RAG] Indexando {len(documents)} documentos no ChromaDB...")

    # Prepara os dados para upsert
    ids = [doc["id"] for doc in documents]
    contents = [doc["content"] for doc in documents]
    metadatas = [doc["metadata"] for doc in documents]

    collection.upsert(
        ids=ids,
        documents=contents,
        metadatas=metadatas,
    )

    count = collection.count()
    print(f"[RAG] ✅ {count} documentos indexados com sucesso!")

    return {
        "status": "indexed",
        "documents": count,
        "message": f"{count} documentos indexados no ChromaDB."
    }


def search_knowledge(query: str, n_results: int = 3, category: str = None) -> list[dict]:
    """
    Busca semântica na base de conhecimento.

    Args:
        query: Pergunta ou termo de busca
        n_results: Número de documentos a retornar
        category: Filtra por categoria (Regras, Analytics, Táticas, etc.)

    Returns:
        Lista de documentos relevantes com scores de similaridade
    """
    collection = get_collection()

    where_clause = {"category": category} if category else None

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count()),
        where=where_clause,
        include=["documents", "metadatas", "distances"],
    )

    documents = []
    for i in range(len(results["ids"][0])):
        documents.append({
            "id": results["ids"][0][i],
            "content": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "similarity": round(1 - results["distances"][0][i], 4),  # Converte distância para similaridade
        })

    return documents


def get_indexed_count() -> int:
    """Retorna o número de documentos indexados."""
    try:
        collection = get_collection()
        return collection.count()
    except Exception:
        return 0
