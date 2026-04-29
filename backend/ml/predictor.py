"""
Módulo 1 — Inferência do Modelo
=================================
Carrega o modelo treinado e realiza previsões em tempo real.
Mantém as métricas dos times em cache para resposta rápida.
"""
import joblib
import pandas as pd
import numpy as np
from functools import lru_cache
from pathlib import Path

from config import settings
from data.loader import get_pbp_data, get_schedules
from ml.features import (
    calculate_team_epa,
    calculate_success_rate,
    FEATURE_COLUMNS,
)


def load_model():
    """Carrega o modelo treinado do disco."""
    path = settings.models_dir / "win_predictor.pkl"
    if not path.exists():
        return None
    return joblib.load(path)


def load_model_metrics() -> dict:
    """Carrega as métricas de avaliação do modelo."""
    path = settings.models_dir / "win_predictor_metrics.pkl"
    if not path.exists():
        return {}
    return joblib.load(path)


@lru_cache(maxsize=1)
def get_current_team_stats() -> pd.DataFrame:
    """
    Calcula e cacheia as estatísticas atuais de todos os times.
    Retorna EPA e Success Rate da temporada atual.
    """
    pbp = get_pbp_data([settings.current_season])
    team_epa = calculate_team_epa(pbp, season=settings.current_season)
    team_sr = calculate_success_rate(pbp, season=settings.current_season)
    return team_epa.merge(team_sr, on=["season", "team"], how="inner")


def get_team_stats(team: str) -> dict | None:
    """Retorna as estatísticas de um time específico."""
    stats_df = get_current_team_stats()
    team_row = stats_df[stats_df["team"] == team.upper()]
    if team_row.empty:
        return None
    return team_row.iloc[0].to_dict()


def predict_matchup(home_team: str, away_team: str) -> dict:
    """
    Prediz a probabilidade de vitória para um confronto.
    
    Usa as estatísticas reais da temporada atual como input
    para o modelo XGBoost treinado.
    """
    model = load_model()
    if model is None:
        return {
            "error": "Modelo não encontrado. Execute: python -m ml.train",
            "home_team": home_team,
            "away_team": away_team,
        }

    home_stats = get_team_stats(home_team)
    away_stats = get_team_stats(away_team)

    if not home_stats:
        return {"error": f"Time '{home_team}' não encontrado nos dados."}
    if not away_stats:
        return {"error": f"Time '{away_team}' não encontrado nos dados."}

    # Monta o vetor de features na ordem exata que o modelo espera
    features = pd.DataFrame([{
        "home_off_epa": home_stats.get("off_epa", 0),
        "home_def_epa": home_stats.get("def_epa", 0),
        "home_off_pass_epa": home_stats.get("off_pass_epa", 0),
        "home_off_rush_epa": home_stats.get("off_rush_epa", 0),
        "home_def_pass_epa": home_stats.get("def_pass_epa", 0),
        "home_def_rush_epa": home_stats.get("def_rush_epa", 0),
        "home_off_sr": home_stats.get("off_success_rate", 0),
        "home_def_sr": home_stats.get("def_success_rate", 0),
        "away_off_epa": away_stats.get("off_epa", 0),
        "away_def_epa": away_stats.get("def_epa", 0),
        "away_off_pass_epa": away_stats.get("off_pass_epa", 0),
        "away_off_rush_epa": away_stats.get("off_rush_epa", 0),
        "away_def_pass_epa": away_stats.get("def_pass_epa", 0),
        "away_def_rush_epa": away_stats.get("def_rush_epa", 0),
        "away_off_sr": away_stats.get("off_success_rate", 0),
        "away_def_sr": away_stats.get("def_success_rate", 0),
    }])

    prob_home_win = float(model.predict_proba(features[FEATURE_COLUMNS])[0][1])
    prob_away_win = 1 - prob_home_win

    # Gera o insight baseado nas stats
    home_advantage = home_stats.get("off_epa", 0) + abs(home_stats.get("def_epa", 0))
    away_advantage = away_stats.get("off_epa", 0) + abs(away_stats.get("def_epa", 0))

    if prob_home_win > 0.65:
        insight = f"{home_team} é favorito claro. Vantagem ofensiva expressiva em casa."
    elif prob_home_win > 0.55:
        insight = f"Leve favoritismo do {home_team}. O mando de campo faz diferença aqui."
    elif prob_away_win > 0.65:
        insight = f"{away_team} viaja como favorito. Eficiência superior nos dados."
    elif prob_away_win > 0.55:
        insight = f"Visitante com leve vantagem. {away_team} está mais eficiente nos dados recentes."
    else:
        insight = "Confronto extremamente equilibrado. Qualquer resultado é provável."

    # Dados para o gráfico de radar
    radar_data = {
        "labels": ["Ataque Aéreo", "Ataque Terrestre", "Defesa Aérea", "Defesa Terrestre"],
        "datasets": [
            {
                "label": home_team,
                "data": [
                    home_stats.get("off_pass_epa", 0),
                    home_stats.get("off_rush_epa", 0),
                    -(home_stats.get("def_pass_epa", 0)),  # Inverte: menor = melhor defesa
                    -(home_stats.get("def_rush_epa", 0)),
                ],
            },
            {
                "label": away_team,
                "data": [
                    away_stats.get("off_pass_epa", 0),
                    away_stats.get("off_rush_epa", 0),
                    -(away_stats.get("def_pass_epa", 0)),
                    -(away_stats.get("def_rush_epa", 0)),
                ],
            },
        ],
    }

    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_win_probability": round(prob_home_win, 3),
        "away_win_probability": round(prob_away_win, 3),
        "insight": insight,
        "home_stats": {k: round(float(v), 4) if isinstance(v, (int, float)) else v
                      for k, v in home_stats.items() if k not in ["season"]},
        "away_stats": {k: round(float(v), 4) if isinstance(v, (int, float)) else v
                      for k, v in away_stats.items() if k not in ["season"]},
        "radar": radar_data,
    }


def get_all_teams_ranking() -> list[dict]:
    """
    Retorna todos os times rankeados por EPA ofensivo.
    Útil para o dashboard principal.
    """
    stats_df = get_current_team_stats()
    stats_df = stats_df.sort_values("off_epa", ascending=False)

    result = []
    for _, row in stats_df.iterrows():
        result.append({
            "team": row["team"],
            "off_epa": round(float(row["off_epa"]), 4),
            "def_epa": round(float(row["def_epa"]), 4),
            "off_pass_epa": round(float(row.get("off_pass_epa", 0)), 4),
            "off_rush_epa": round(float(row.get("off_rush_epa", 0)), 4),
            "off_success_rate": round(float(row.get("off_success_rate", 0)), 4),
            "def_success_rate": round(float(row.get("def_success_rate", 0)), 4),
        })

    return result
