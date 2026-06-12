"""
Métricas puras do eval — sem rede, sem LLM.
Usadas pelo runner (evals.run) e testadas na suíte pytest.
"""
import re


def hit_at_k(retrieved_ids: list[str], expected_ids: list[str], k: int) -> bool:
    """True se qualquer doc esperado aparece no top-k recuperado."""
    return any(doc_id in expected_ids for doc_id in retrieved_ids[:k])


def mrr(retrieved_ids: list[str], expected_ids: list[str]) -> float:
    """1/rank do primeiro doc esperado; 0.0 se nenhum aparece."""
    for rank, doc_id in enumerate(retrieved_ids, start=1):
        if doc_id in expected_ids:
            return 1.0 / rank
    return 0.0


def fact_coverage(answer: str, expected_facts: list[str]) -> float:
    """Fração dos fatos (regex case-insensitive) presentes na resposta."""
    if not expected_facts:
        return 1.0
    hits = sum(1 for fact in expected_facts if re.search(fact, answer, re.IGNORECASE))
    return hits / len(expected_facts)


def tool_match(tools_used: list[str], expected_tools: list[str]) -> bool:
    """True se todas as tools esperadas foram usadas (ordem livre, extras ok)."""
    return set(expected_tools).issubset(set(tools_used))


def mean(values: list) -> float | None:
    """Média ignorando None; bools contam como 0/1. None se vazio."""
    vals = [float(v) for v in values if v is not None]
    return round(sum(vals) / len(vals), 3) if vals else None
