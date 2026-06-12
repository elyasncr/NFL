"""
LLM-as-judge local via Ollama.
Limitação conhecida: o judge é o mesmo modelo que gera as respostas
(tende a se favorecer) — por isso a rubrica ancora em fidelidade ao
contexto recuperado, que é dado, e não em qualidade subjetiva.
"""
import json

import httpx

from config import settings

JUDGE_PROMPT = """Você é um avaliador rigoroso de respostas sobre NFL.

PERGUNTA: {question}

CONTEXTO RECUPERADO (fonte da verdade):
{context}

RESPOSTA A AVALIAR:
{answer}

Dê uma nota de 1 a 5 considerando APENAS:
- Fidelidade: a resposta usa o contexto sem inventar fatos? (peso maior)
- Correção: o que ela afirma está certo?
- Completude: ela responde a pergunta?

Rubrica: 5 = fiel, correta e completa; 3 = parcialmente correta ou incompleta; 1 = errada ou alucinada.

Responda SOMENTE com JSON neste formato: {{"score": <1-5>, "justificativa": "<uma frase>"}}"""


def parse_judge_response(text: str | None) -> dict | None:
    """JSON do judge → dict validado (score com clamp 1-5), ou None."""
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    score = data.get("score")
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        return None
    return {
        "score": max(1, min(5, int(score))),
        "justificativa": str(data.get("justificativa", ""))[:300],
    }


async def judge_answer(question: str, context: str, answer: str) -> dict | None:
    """Nota 1-5 via Ollama (temp 0, format json). None se falhar após 1 retry."""
    prompt = JUDGE_PROMPT.format(question=question, context=context, answer=answer)
    async with httpx.AsyncClient(timeout=120.0) as client:
        for _ in range(2):  # 1 tentativa + 1 retry (JSON inválido OU erro transiente)
            try:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/chat",
                    json={
                        "model": settings.ollama_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "format": "json",
                        "options": {"temperature": 0},
                    },
                )
                resp.raise_for_status()
                parsed = parse_judge_response(resp.json()["message"]["content"])
                if parsed:
                    return parsed
            except (httpx.HTTPError, KeyError):
                continue
    return None
