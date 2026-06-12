"""Testes do pacote evals — só funções puras, sem rede/LLM."""
import json
import re
from pathlib import Path

import pytest

from evals.metrics import hit_at_k, mrr, fact_coverage, tool_match, mean
from evals.judge import parse_judge_response


# ─── retrieval ───

def test_hit_at_k():
    retrieved = ["a", "b", "c", "d", "e"]
    assert hit_at_k(retrieved, ["a"], 1) is True
    assert hit_at_k(retrieved, ["c"], 1) is False
    assert hit_at_k(retrieved, ["c"], 3) is True
    assert hit_at_k(retrieved, ["z"], 5) is False
    assert hit_at_k(retrieved, ["z", "b"], 3) is True   # qualquer um dos esperados


def test_mrr():
    assert mrr(["a", "b", "c"], ["a"]) == 1.0
    assert mrr(["a", "b", "c"], ["c"]) == pytest.approx(1 / 3)
    assert mrr(["a", "b", "c"], ["z"]) == 0.0
    assert mrr(["a", "b", "c"], ["z", "b"]) == 0.5      # primeiro esperado encontrado


# ─── geração ───

def test_fact_coverage():
    answer = "EPA mede os Pontos Esperados adicionados por jogada."
    assert fact_coverage(answer, ["pontos esperados|expected points"]) == 1.0
    assert fact_coverage(answer, ["pontos esperados", "touchdown"]) == 0.5
    assert fact_coverage(answer, []) == 1.0              # sem fatos = passa
    assert fact_coverage("", ["x"]) == 0.0


def test_fact_coverage_case_insensitive():
    assert fact_coverage("o epa É IMPORTANTE", ["EPA"]) == 1.0


# ─── agente ───

def test_tool_match():
    assert tool_match(["predict_matchup"], ["predict_matchup"]) is True
    assert tool_match(["a", "predict_matchup"], ["predict_matchup"]) is True   # superset ok
    assert tool_match(["get_team_stats"], ["predict_matchup"]) is False
    assert tool_match([], ["predict_matchup"]) is False
    assert tool_match(["a", "b"], ["a", "b"]) is True
    assert tool_match([], []) is True  # vacuamente verdadeiro — dataset impede esse caso


# ─── agregação ───

def test_mean_ignora_none():
    assert mean([1, 2, 3]) == 2.0
    assert mean([1, None, 3]) == 2.0
    assert mean([True, False]) == 0.5    # bools viram 0/1
    assert mean([]) is None
    assert mean([None]) is None


# ─── judge: parse defensivo ───

def test_parse_judge_valido():
    result = parse_judge_response('{"score": 4, "justificativa": "Fiel ao contexto."}')
    assert result == {"score": 4, "justificativa": "Fiel ao contexto."}


def test_parse_judge_invalido():
    assert parse_judge_response("não é json") is None
    assert parse_judge_response(None) is None
    assert parse_judge_response('{"justificativa": "sem score"}') is None
    assert parse_judge_response('{"score": "alto"}') is None


def test_parse_judge_clamp():
    assert parse_judge_response('{"score": 9}')["score"] == 5
    assert parse_judge_response('{"score": 0}')["score"] == 1
    assert parse_judge_response('{"score": 3.7}')["score"] == 3


DATA_DIR = Path(__file__).resolve().parent.parent / "evals" / "data"


# ─── golden datasets: validação estrutural (sem rede) ───

def test_rag_golden_valido():
    from rag.knowledge_base import NFL_DOCUMENTS
    doc_ids = {d["id"] for d in NFL_DOCUMENTS}
    items = json.loads((DATA_DIR / "rag_golden.json").read_text(encoding="utf-8"))
    assert len(items) >= 25
    seen = set()
    for item in items:
        assert item["id"] not in seen, f"id duplicado: {item['id']}"
        seen.add(item["id"])
        assert item["question"].strip()
        assert item["expected_doc_ids"], f"{item['id']} sem expected_doc_ids"
        assert set(item["expected_doc_ids"]) <= doc_ids, f"{item['id']}: doc_id inexistente"
        assert item["expected_facts"], f"{item['id']} sem expected_facts"
        for fact in item["expected_facts"]:
            re.compile(fact)  # regex inválido explode aqui


def test_agent_golden_valido():
    from agent.tools import AGENT_TOOLS
    valid_tools = {t["function"]["name"] for t in AGENT_TOOLS}
    items = json.loads((DATA_DIR / "agent_golden.json").read_text(encoding="utf-8"))
    assert len(items) >= 10
    seen = set()
    for item in items:
        assert item["id"] not in seen
        seen.add(item["id"])
        assert item["question"].strip()
        assert item["expected_tools"], f"{item['id']} sem expected_tools"
        assert set(item["expected_tools"]) <= valid_tools, f"{item['id']}: tool inexistente"
        for fact in item.get("expected_facts", []):
            re.compile(fact)
