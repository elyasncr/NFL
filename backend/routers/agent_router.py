"""
Módulo 3 — Agente de IA
=========================
Agente ReAct com ferramentas de ML, RAG e dados da NFL.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from agent.nfl_agent import run_agent
from agent.tools import AGENT_TOOLS

router = APIRouter(prefix="/agent", tags=["AI Agent"])


class AgentRequest(BaseModel):
    question: str
    history: list[dict] = []


@router.get("/status")
def agent_status():
    return {
        "module": "AI Agent (Módulo 3)",
        "status": "ativo",
        "tools_available": [t["function"]["name"] for t in AGENT_TOOLS],
        "model": "llama3 (Ollama local)",
        "architecture": "ReAct (Reason + Act)"
    }


@router.post("/ask")
async def ask_agent(request: AgentRequest):
    """
    Faz uma pergunta ao agente em linguagem natural.
    O agente decide quais ferramentas usar e retorna o raciocínio completo.

    Exemplos:
    - "Quem vai ganhar: KC em casa contra SF?"
    - "O Drake Maye deveria ser banquado?"
    - "Qual o melhor ataque da liga agora?"
    - "Me explica como o EPA funciona e qual time tem o maior"
    """
    result = await run_agent(
        question=request.question,
        history=request.history,
    )
    return result


@router.get("/tools")
def list_tools():
    """Lista as ferramentas disponíveis para o agente."""
    return {
        "tools": [
            {
                "name": t["function"]["name"],
                "description": t["function"]["description"],
                "parameters": list(t["function"]["parameters"].get("properties", {}).keys()),
            }
            for t in AGENT_TOOLS
        ]
    }
