"""
Módulo 3 — Agente NFL com LangGraph
=====================================
Implementa um agente ReAct (Reason + Act) usando LangGraph.

O agente:
1. Recebe a pergunta do usuário
2. Decide quais ferramentas usar (e em que ordem)
3. Executa as ferramentas
4. Sintetiza a resposta final

Ferramentas disponíveis:
- get_team_stats: EPA e métricas do time
- predict_matchup: probabilidade de vitória ML
- check_qb_hot_seat: avaliação do QB
- search_nfl_knowledge: busca RAG
- get_team_rankings: ranking geral
"""
import json
import httpx
from typing import TypedDict, Annotated
from agent.tools import AGENT_TOOLS, execute_tool
from config import settings


# ─── State do Agente ──────────────────────────────────────────

class AgentState(TypedDict):
    messages: list[dict]
    tool_calls: list[dict]
    tool_results: list[dict]
    final_answer: str
    steps: list[dict]  # Raciocínio visível no frontend


# ─── Funções do grafo ─────────────────────────────────────────

AGENT_SYSTEM_PROMPT = """Você é o NFL Analytics Agent — um assistente especializado em futebol americano 
com acesso a ferramentas de análise de dados em tempo real.

Você pode usar as seguintes ferramentas:
1. get_team_stats: Estatísticas EPA de um time específico
2. predict_matchup: Probabilidade de vitória (modelo ML XGBoost)
3. check_qb_hot_seat: Análise do QB e alerta de berlinda
4. search_nfl_knowledge: Base de conhecimento (regras, métricas, táticas)
5. get_team_rankings: Ranking geral dos times

INSTRUÇÕES:
- Responda SEMPRE em português brasileiro
- Use ferramentas quando precisar de dados específicos
- Explique seu raciocínio de forma clara
- Cite os dados encontrados nas ferramentas
- Seja analítico e objetivo"""


async def call_ollama_with_tools(messages: list[dict]) -> dict:
    """
    Chama o Ollama com suporte a function calling.
    Retorna a resposta do modelo (pode incluir tool_calls).
    """
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": messages,
                "tools": AGENT_TOOLS,
                "stream": False,
                "options": {"temperature": 0.3}  # Menor temp para raciocínio mais determinístico
            }
        )
        response.raise_for_status()
        return response.json()


async def run_agent(question: str, history: list[dict] = None, max_iterations: int = 5) -> dict:
    """
    Executa o agente ReAct completo.

    Args:
        question: Pergunta do usuário em linguagem natural
        history: Histórico da conversa
        max_iterations: Máximo de ciclos raciocínio→ação

    Returns:
        dict com resposta final, passos do raciocínio e ferramentas usadas
    """
    steps = []
    tool_results_log = []

    # Monta as mensagens iniciais
    messages = [{"role": "system", "content": AGENT_SYSTEM_PROMPT}]
    if history:
        messages.extend(history[-4:])  # Últimas 2 trocas
    messages.append({"role": "user", "content": question})

    steps.append({
        "step": 1,
        "type": "thinking",
        "content": f"Analisando a pergunta: '{question}'"
    })

    try:
        for iteration in range(max_iterations):
            # Chama o modelo
            response = await call_ollama_with_tools(messages)
            assistant_message = response.get("message", {})

            # Verifica se o modelo quer usar ferramentas
            tool_calls = assistant_message.get("tool_calls", [])

            if not tool_calls:
                # Sem ferramentas: resposta final
                final_answer = assistant_message.get("content", "Não consegui gerar uma resposta.")
                steps.append({
                    "step": len(steps) + 1,
                    "type": "answer",
                    "content": "Resposta gerada com base nas informações coletadas."
                })
                return {
                    "answer": final_answer,
                    "steps": steps,
                    "tools_used": [t["tool"] for t in tool_results_log],
                    "tool_results": tool_results_log,
                    "iterations": iteration + 1,
                }

            # Adiciona a resposta do assistente ao histórico
            messages.append({"role": "assistant", "content": None, "tool_calls": tool_calls})

            # Executa cada ferramenta chamada
            for tool_call in tool_calls:
                function = tool_call.get("function", {})
                tool_name = function.get("name", "")
                tool_args_raw = function.get("arguments", {})

                # O Ollama pode retornar args como string JSON ou dict
                if isinstance(tool_args_raw, str):
                    try:
                        tool_args = json.loads(tool_args_raw)
                    except json.JSONDecodeError:
                        tool_args = {}
                else:
                    tool_args = tool_args_raw

                steps.append({
                    "step": len(steps) + 1,
                    "type": "tool_call",
                    "content": f"Usando ferramenta: **{tool_name}**",
                    "tool": tool_name,
                    "args": tool_args,
                })

                # Executa a ferramenta
                result = await execute_tool(tool_name, tool_args)
                result_str = json.dumps(result, ensure_ascii=False, indent=2)

                tool_results_log.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result": result,
                })

                steps.append({
                    "step": len(steps) + 1,
                    "type": "tool_result",
                    "content": f"Resultado de {tool_name}",
                    "data": result,
                })

                # Adiciona resultado ao histórico para o próximo ciclo
                messages.append({
                    "role": "tool",
                    "content": result_str,
                })

    except httpx.ConnectError:
        # Ollama não está rodando — fallback para resposta sem LLM
        fallback = await _generate_fallback_response(question, steps, tool_results_log)
        return fallback
    except Exception as e:
        return {
            "answer": f"Erro no agente: {str(e)}",
            "steps": steps,
            "tools_used": [],
            "tool_results": [],
            "iterations": 0,
            "error": str(e),
        }

    return {
        "answer": "Limite de iterações atingido. Tente uma pergunta mais específica.",
        "steps": steps,
        "tools_used": [t["tool"] for t in tool_results_log],
        "tool_results": tool_results_log,
        "iterations": max_iterations,
    }


async def _generate_fallback_response(question: str, steps: list, tool_results: list) -> dict:
    """
    Quando Ollama não está disponível, gera resposta baseada apenas nas ferramentas.
    Útil para demonstração mesmo sem o LLM rodando.
    """
    # Tenta inferir quais ferramentas chamar baseado em keywords
    question_lower = question.lower()
    
    if any(kw in question_lower for kw in ["quem vai ganhar", "probabilidade", "favorito", "vs", "contra"]):
        # Tenta extrair times da pergunta — simplificado
        tools_to_call = [("search_nfl_knowledge", {"query": question})]
    elif any(kw in question_lower for kw in ["berlinda", "banco", "substituir", "mal", "ruim"]):
        tools_to_call = [("search_nfl_knowledge", {"query": "berlinda QB EPA performance"})]
    else:
        tools_to_call = [("search_nfl_knowledge", {"query": question})]

    for tool_name, tool_args in tools_to_call:
        result = await execute_tool(tool_name, tool_args)
        tool_results.append({"tool": tool_name, "args": tool_args, "result": result})
        steps.append({"step": len(steps)+1, "type": "tool_result", "content": f"Resultado de {tool_name}", "data": result})

    # Monta resposta textual com os dados
    answer_parts = [
        "⚠️ **Ollama não está disponível** — respondendo apenas com dados das ferramentas.\n",
        "Para ativar o LLM: `ollama serve && ollama pull llama3`\n\n",
        "**Dados encontrados:**\n"
    ]

    for tr in tool_results:
        answer_parts.append(f"\n**{tr['tool']}**: {json.dumps(tr['result'], ensure_ascii=False, indent=2)}")

    return {
        "answer": "".join(answer_parts),
        "steps": steps,
        "tools_used": [t["tool"] for t in tool_results],
        "tool_results": tool_results,
        "iterations": 1,
        "ollama_available": False,
    }
