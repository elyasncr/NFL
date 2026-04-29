"""
Módulo 1 — Endpoints de Machine Learning
==========================================
Todos os endpoints do módulo de ML clássico.
"""
from fastapi import APIRouter, HTTPException
from data.loader import get_pbp_data
from ml.features import get_qb_hot_seat, get_qb_cpoe_stats, calculate_player_props
from ml.predictor import predict_matchup, get_all_teams_ranking, get_team_stats, load_model_metrics
from ml.teams_info import get_teams_info
from config import settings

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/teams")
def list_all_teams():
    """
    Retorna todos os times com suas métricas de EPA e Success Rate.
    Ranqueados por eficiência ofensiva.
    """
    return get_all_teams_ranking()


@router.get("/teams/{team_abbr}")
def get_team(team_abbr: str):
    """Retorna as métricas de um time específico."""
    stats = get_team_stats(team_abbr.upper())
    if not stats:
        raise HTTPException(status_code=404, detail=f"Time '{team_abbr}' não encontrado.")
    return stats


@router.get("/matchup/{home_team}/{away_team}")
def matchup_prediction(home_team: str, away_team: str):
    """
    Prediz a probabilidade de vitória para um confronto.
    Retorna também os dados para o gráfico de radar.
    
    Exemplo: /ml/matchup/KC/SF
    """
    result = predict_matchup(home_team.upper(), away_team.upper())
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/hot-seat/{team_abbr}")
def qb_hot_seat(team_abbr: str, last_games: int = 3):
    """
    Avalia se o QB titular está na "Berlinda".
    Analisa os últimos N jogos e retorna EPA, CPOE e tendência.
    
    Exemplo: /ml/hot-seat/NE?last_games=3
    """
    pbp = get_pbp_data([settings.current_season])
    result = get_qb_hot_seat(pbp, team_abbr.upper(), last_n_games=last_games)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/qb-rankings")
def qb_rankings(season: int = None):
    """
    Ranqueia todos os QBs por EPA e CPOE.
    Útil para comparar performance de passadores.
    """
    year = season or settings.current_season
    pbp = get_pbp_data([year])
    stats = get_qb_cpoe_stats(pbp, season=year)
    return stats.to_dict(orient="records")


@router.get("/player-props/{player_name}")
def player_props(player_name: str, position: str = "receiver"):
    """
    Calcula o Floor e Ceiling de yardas de um jogador.
    
    Parâmetros:
    - player_name: Nome (parcial) do jogador
    - position: 'receiver' ou 'rusher'
    
    Exemplo: /ml/player-props/Hill?position=receiver
    """
    pbp = get_pbp_data([settings.current_season])
    result = calculate_player_props(pbp, player_name, position)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/model-info")
def model_info():
    """
    Retorna as métricas de avaliação do modelo treinado.
    Mostra acurácia, ROC-AUC e feature importance.
    """
    metrics = load_model_metrics()
    if not metrics:
        return {
            "status": "Modelo não treinado",
            "instructions": "Execute: python -m ml.train"
        }
    return {"status": "Modelo carregado", **metrics}


@router.get("/teams-info")
def teams_info():
    """
    Metadata dos 32 times: nome completo, cidade, apelido, conferência,
    divisão, cor primária/secundária (hex) e URL do logo ESPN.
    Cacheado em memória.
    """
    return get_teams_info()
