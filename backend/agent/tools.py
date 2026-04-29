"""
Módulo 3 — Ferramentas do Agente
==================================
Cada ferramenta é uma função que o agente LangGraph pode invocar
para responder perguntas complexas sobre NFL.

O agente decide automaticamente qual ferramenta usar e em que ordem,
baseando-se na pergunta do usuário.
"""
import json
from typing import Any


# ─── Definição das ferramentas para o Ollama (formato JSON Schema) ─────────

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_team_stats",
            "description": "Busca as estatísticas avançadas (EPA, Success Rate) de um time da NFL na temporada atual. Use quando o usuário perguntar sobre o desempenho de um time específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "team_abbr": {
                        "type": "string",
                        "description": "Sigla do time em maiúsculas. Exemplos: KC (Chiefs), NE (Patriots), SF (49ers), BUF (Bills), PHI (Eagles), DAL (Cowboys)"
                    }
                },
                "required": ["team_abbr"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "predict_matchup",
            "description": "Usa o modelo XGBoost para calcular a probabilidade de vitória em um confronto entre dois times. Use quando o usuário perguntar sobre chances de vitória, favorito, ou análise de confronto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "home_team": {
                        "type": "string",
                        "description": "Sigla do time da casa (ex: KC, SF, BUF)"
                    },
                    "away_team": {
                        "type": "string",
                        "description": "Sigla do time visitante (ex: NE, DAL, MIA)"
                    }
                },
                "required": ["home_team", "away_team"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_qb_hot_seat",
            "description": "Analisa se o QB titular de um time está na berlinda (desempenho ruim nos últimos jogos). Use quando perguntar sobre o QB de um time, substituição, ou performance recente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "team_abbr": {
                        "type": "string",
                        "description": "Sigla do time (ex: NE, NYG, CAR)"
                    },
                    "last_games": {
                        "type": "integer",
                        "description": "Número de jogos recentes a analisar (padrão: 3)",
                        "default": 3
                    }
                },
                "required": ["team_abbr"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_nfl_knowledge",
            "description": "Busca informações na base de conhecimento sobre regras, métricas (EPA, CPOE), formações, táticas e contexto da NFL. Use para explicar conceitos ou responder perguntas gerais sobre football.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Termo ou pergunta para buscar na base de conhecimento"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_team_rankings",
            "description": "Retorna o ranking de todos os 32 times da NFL por EPA ofensivo. Use quando o usuário perguntar sobre o melhor/pior time, ranking geral, ou comparar múltiplos times.",
            "parameters": {
                "type": "object",
                "properties": {
                    "top_n": {
                        "type": "integer",
                        "description": "Quantos times mostrar (padrão: 5)",
                        "default": 5
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["off_epa", "def_epa"],
                        "description": "Métrica para ranquear: 'off_epa' (melhor ataque) ou 'def_epa' (melhor defesa)"
                    }
                },
                "required": []
            }
        }
    }
]


# ─── Executores das ferramentas ──────────────────────────────────────────────

async def execute_tool(tool_name: str, tool_args: dict) -> Any:
    """
    Executa uma ferramenta pelo nome e retorna o resultado.
    """
    if tool_name == "get_team_stats":
        return await _get_team_stats(**tool_args)
    elif tool_name == "predict_matchup":
        return await _predict_matchup(**tool_args)
    elif tool_name == "check_qb_hot_seat":
        return await _check_qb_hot_seat(**tool_args)
    elif tool_name == "search_nfl_knowledge":
        return await _search_nfl_knowledge(**tool_args)
    elif tool_name == "get_team_rankings":
        return await _get_team_rankings(**tool_args)
    else:
        return {"error": f"Ferramenta '{tool_name}' não encontrada."}


async def _get_team_stats(team_abbr: str) -> dict:
    from ml.predictor import get_team_stats
    stats = get_team_stats(team_abbr.upper())
    if not stats:
        return {"error": f"Time '{team_abbr}' não encontrado. Verifique a sigla."}
    # Formata de forma legível para o LLM
    return {
        "team": team_abbr.upper(),
        "offensive_epa_per_play": round(float(stats.get("off_epa", 0)), 4),
        "defensive_epa_per_play": round(float(stats.get("def_epa", 0)), 4),
        "pass_offense_epa": round(float(stats.get("off_pass_epa", 0)), 4),
        "rush_offense_epa": round(float(stats.get("off_rush_epa", 0)), 4),
        "offensive_success_rate": round(float(stats.get("off_success_rate", 0)), 4),
        "note": "EPA positivo = acima da média da liga. Negativo = abaixo da média."
    }


async def _predict_matchup(home_team: str, away_team: str) -> dict:
    from ml.predictor import predict_matchup
    result = predict_matchup(home_team.upper(), away_team.upper())
    if "error" in result:
        return result
    return {
        "matchup": f"{home_team.upper()} (casa) vs {away_team.upper()} (visitante)",
        "home_win_probability": f"{result['home_win_probability']:.1%}",
        "away_win_probability": f"{result['away_win_probability']:.1%}",
        "model_insight": result["insight"],
        "note": "Modelo XGBoost treinado com dados de EPA e Success Rate das últimas temporadas."
    }


async def _check_qb_hot_seat(team_abbr: str, last_games=3) -> dict:
    from data.loader import get_pbp_data
    from ml.features import get_qb_hot_seat
    from config import settings
    last_games = int(last_games)  # llama3.1 às vezes manda string
    pbp = get_pbp_data([settings.current_season])
    result = get_qb_hot_seat(pbp, team_abbr.upper(), last_n_games=last_games)
    if "error" in result:
        return result
    return {
        "quarterback": result["quarterback"],
        "team": result["team"],
        "recent_epa_per_play": result["recent_epa"],
        "recent_cpoe": result["recent_cpoe"],
        "trend": result["trend"],
        "status": result["severity"],
        "on_hot_seat": result["is_critical"],
        "assessment": result["message"]
    }


async def _search_nfl_knowledge(query: str) -> dict:
    from rag.ingest import search_knowledge, get_indexed_count, ingest_documents
    if get_indexed_count() == 0:
        ingest_documents()
    results = search_knowledge(query, n_results=2)
    if not results:
        return {"content": "Nenhum documento relevante encontrado."}
    combined = "\n\n".join([f"[{r['metadata']['title']}]\n{r['content'][:500]}" for r in results])
    return {"content": combined, "sources": [r["metadata"]["title"] for r in results]}


async def _get_team_rankings(top_n=5, metric: str = "off_epa") -> dict:
    from ml.predictor import get_all_teams_ranking
    top_n = int(top_n)  # llama3.1 às vezes manda string
    all_teams = get_all_teams_ranking()
    if metric == "def_epa":
        sorted_teams = sorted(all_teams, key=lambda x: x["def_epa"])  # menor = melhor defesa
    else:
        sorted_teams = sorted(all_teams, key=lambda x: x["off_epa"], reverse=True)
    top = sorted_teams[:top_n]
    return {
        "metric": metric,
        "ranking": [
            {"rank": i+1, "team": t["team"], "value": round(t[metric], 4)}
            for i, t in enumerate(top)
        ],
        "note": "EPA ofensivo: maior = melhor. EPA defensivo: menor = melhor."
    }
