"""
Runner do eval — uso (dentro do container):

    python -m evals.run               # tudo (retrieval + RAG + agente)
    python -m evals.run --retrieval   # só retrieval (segundos, sem LLM)
    python -m evals.run --rag         # respostas RAG (+ judge)
    python -m evals.run --agent       # seleção de tools do agente
    python -m evals.run --no-judge    # pula o LLM-as-judge
    python -m evals.run --limit 5     # só os primeiros N itens (smoke)
"""
import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

import httpx

from config import settings
from evals.metrics import fact_coverage, hit_at_k, mean, mrr, tool_match

DATA_DIR = Path(__file__).resolve().parent / "data"
RESULTS_DIR = Path(__file__).resolve().parent / "results"
HISTORY_DIR = RESULTS_DIR / "history"


def load_golden(name: str) -> list[dict]:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def ollama_available() -> bool:
    try:
        return httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3.0).status_code == 200
    except httpx.HTTPError:
        return False


# ─── Camada 1: retrieval (determinística, sem LLM) ───

def run_retrieval(items: list[dict]) -> dict:
    from rag.ingest import search_knowledge
    from rag.retriever import ensure_indexed

    ensure_indexed()
    per_item = []
    for item in items:
        try:
            docs = search_knowledge(item["question"], n_results=5)
            ids = [d["id"] for d in docs]
            per_item.append({
                "id": item["id"],
                "hit_at_1": hit_at_k(ids, item["expected_doc_ids"], 1),
                "hit_at_3": hit_at_k(ids, item["expected_doc_ids"], 3),
                "mrr": round(mrr(ids, item["expected_doc_ids"]), 3),
                "retrieved": ids[:3],
            })
        except Exception as e:  # noqa: BLE001 — item com erro não derruba o run
            per_item.append({"id": item["id"], "error": str(e)})
    ok = [r for r in per_item if "error" not in r]
    return {
        "summary": {
            "items": len(per_item),
            "errors": len(per_item) - len(ok),
            "hit_at_1": mean([r["hit_at_1"] for r in ok]),
            "hit_at_3": mean([r["hit_at_3"] for r in ok]),
            "mrr": mean([r["mrr"] for r in ok]),
        },
        "per_item": per_item,
    }


# ─── Relatórios ───

def build_markdown(results: dict, timestamp: str) -> str:
    lines = [f"# Eval — {timestamp}", "", "| Camada | Métrica | Valor |", "|---|---|---|"]
    if "retrieval" in results:
        s = results["retrieval"]["summary"]
        lines.append(f"| Retrieval | hit@1 / hit@3 / MRR | {s['hit_at_1']} / {s['hit_at_3']} / {s['mrr']} |")
    if "rag" in results:
        s = results["rag"]["summary"]
        lines.append(f"| RAG | fact coverage / judge (1-5) | {s['fact_coverage']} / {s['judge_score']} |")
    if "agent" in results:
        s = results["agent"]["summary"]
        lines.append(f"| Agente | tool accuracy / iterações médias | {s['tool_accuracy']} / {s['avg_iterations']} |")

    worst = []
    for r in results.get("retrieval", {}).get("per_item", []):
        if "error" in r:
            worst.append(f"- `{r['id']}` (retrieval): ERRO {r['error']}")
        elif not r["hit_at_3"]:
            worst.append(f"- `{r['id']}` (retrieval): doc esperado fora do top-3 — veio {r['retrieved']}")
    for r in results.get("rag", {}).get("per_item", []):
        if "error" in r:
            worst.append(f"- `{r['id']}` (rag): ERRO {r['error']}")
        elif r["fact_coverage"] < 1.0 or (r["judge_score"] is not None and r["judge_score"] <= 2):
            worst.append(f"- `{r['id']}` (rag): coverage {r['fact_coverage']}, judge {r['judge_score']}")
    for r in results.get("agent", {}).get("per_item", []):
        if "error" in r:
            worst.append(f"- `{r['id']}` (agent): ERRO {r['error']}")
        elif not r["tool_match"]:
            worst.append(f"- `{r['id']}` (agent): esperado {r['expected_tools']} → usado {r['tools_used']}")
    if worst:
        lines += ["", "## Piores itens", *worst]
    return "\n".join(lines) + "\n"


def write_reports(results: dict) -> str:
    RESULTS_DIR.mkdir(exist_ok=True)
    HISTORY_DIR.mkdir(exist_ok=True)
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M")
    payload = {"timestamp": timestamp, **results}
    (RESULTS_DIR / "latest.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    markdown = build_markdown(results, timestamp)
    (RESULTS_DIR / "latest.md").write_text(markdown, encoding="utf-8")
    (HISTORY_DIR / f"{now.strftime('%Y%m%d-%H%M%S')}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return markdown


def main() -> None:
    parser = argparse.ArgumentParser(description="Eval do RAG + Agente")
    parser.add_argument("--retrieval", action="store_true", help="só a camada de retrieval")
    parser.add_argument("--rag", action="store_true", help="só respostas RAG (+ judge)")
    parser.add_argument("--agent", action="store_true", help="só o agente")
    parser.add_argument("--no-judge", action="store_true", help="pula o LLM-as-judge")
    parser.add_argument("--limit", type=int, default=None, help="só os primeiros N itens")
    args = parser.parse_args()

    run_all = not (args.retrieval or args.rag or args.agent)
    rag_items = load_golden("rag_golden.json")[: args.limit]
    agent_items = load_golden("agent_golden.json")[: args.limit]

    results: dict = {}
    if run_all or args.retrieval:
        print(f"[eval] Retrieval: {len(rag_items)} perguntas...")
        results["retrieval"] = run_retrieval(rag_items)

    # Camadas 2 e 3 entram na Task 5
    if (run_all or args.rag or args.agent) and "run_rag" not in globals():
        print("[eval] Camadas RAG/agente ainda não implementadas (Task 5).")

    markdown = write_reports(results)
    print("\n" + markdown)


if __name__ == "__main__":
    main()
