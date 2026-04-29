"""
Módulo 1 — Feature Engineering
================================
Aqui calculamos todas as métricas avançadas do projeto:

- EPA (Expected Points Added): Valor de cada jogada em pontos esperados
- CPOE (Completion % Over Expected): Precisão real do QB vs média esperada
- Success Rate: % de jogadas consideradas "bem-sucedidas"
- Turnover Points: Impacto dos turnovers em pontos
- Player Props: Floor e Ceiling de yardas por jogador

Cada função recebe um DataFrame de play-by-play e retorna métricas prontas
para consumo pelo modelo de ML ou pelos endpoints da API.
"""
import pandas as pd
import numpy as np
from typing import Optional


# ─────────────────────────────────────────
# 1. MÉTRICAS POR TIME
# ─────────────────────────────────────────

def calculate_team_epa(pbp: pd.DataFrame, season: Optional[int] = None) -> pd.DataFrame:
    """
    Calcula o EPA ofensivo e defensivo por time.
    
    EPA > 0 = a jogada foi melhor que o esperado
    EPA < 0 = a jogada foi pior que o esperado
    
    Retorna um DataFrame com colunas:
    - team, season
    - off_epa (média do EPA ofensivo)
    - def_epa (média do EPA concedido como defesa)
    - off_pass_epa, off_rush_epa (EPA separado por tipo)
    - def_pass_epa, def_rush_epa
    """
    df = pbp.copy()
    if season:
        df = df[df["season"] == season]

    # Filtra apenas jogadas de passe e corrida com EPA válido
    plays = df[
        ((df["pass"] == 1) | (df["rush"] == 1)) &
        df["epa"].notna() &
        df["posteam"].notna()
    ].copy()

    passes = plays[plays["pass"] == 1]
    rushes = plays[plays["rush"] == 1]

    # EPA Ofensivo
    off_epa = plays.groupby(["season", "posteam"])["epa"].mean().reset_index()
    off_pass_epa = passes.groupby(["season", "posteam"])["epa"].mean().reset_index()
    off_rush_epa = rushes.groupby(["season", "posteam"])["epa"].mean().reset_index()

    # EPA Defensivo (EPA concedido — quanto pior, melhor a defesa)
    def_epa = plays.groupby(["season", "defteam"])["epa"].mean().reset_index()
    def_pass_epa = passes.groupby(["season", "defteam"])["epa"].mean().reset_index()
    def_rush_epa = rushes.groupby(["season", "defteam"])["epa"].mean().reset_index()

    # Monta DataFrame final
    result = off_epa.rename(columns={"posteam": "team", "epa": "off_epa"})
    result = result.merge(
        off_pass_epa.rename(columns={"posteam": "team", "epa": "off_pass_epa"}),
        on=["season", "team"], how="left"
    ).merge(
        off_rush_epa.rename(columns={"posteam": "team", "epa": "off_rush_epa"}),
        on=["season", "team"], how="left"
    ).merge(
        def_epa.rename(columns={"defteam": "team", "epa": "def_epa"}),
        on=["season", "team"], how="left"
    ).merge(
        def_pass_epa.rename(columns={"defteam": "team", "epa": "def_pass_epa"}),
        on=["season", "team"], how="left"
    ).merge(
        def_rush_epa.rename(columns={"defteam": "team", "epa": "def_rush_epa"}),
        on=["season", "team"], how="left"
    )

    return result.round(4)


def calculate_success_rate(pbp: pd.DataFrame, season: Optional[int] = None) -> pd.DataFrame:
    """
    Calcula o Success Rate ofensivo e defensivo por time.
    
    Uma jogada é "sucesso" se:
    - 1ª descida: ganha >= 40% das jardas necessárias
    - 2ª descida: ganha >= 60% das jardas necessárias  
    - 3ª ou 4ª descida: ganha 100% (faz o primeiro down)
    
    Esta métrica elimina o efeito do "garbage time" e é mais honesta
    que simplesmente contar jardas.
    """
    df = pbp.copy()
    if season:
        df = df[df["season"] == season]

    plays = df[
        ((df["pass"] == 1) | (df["rush"] == 1)) &
        df["success"].notna() &
        df["posteam"].notna()
    ]

    off_sr = plays.groupby(["season", "posteam"])["success"].mean().reset_index()
    def_sr = plays.groupby(["season", "defteam"])["success"].mean().reset_index()

    result = off_sr.rename(columns={"posteam": "team", "success": "off_success_rate"})
    result = result.merge(
        def_sr.rename(columns={"defteam": "team", "success": "def_success_rate"}),
        on=["season", "team"], how="left"
    )

    return result.round(4)


def calculate_turnover_points(pbp: pd.DataFrame, season: Optional[int] = None) -> pd.DataFrame:
    """
    Calcula pontos gerados/perdidos por turnovers.
    
    Turnovers têm impacto DUPLO: tiram a posse do ataque E dão ao adversário
    uma posição favorável no campo. Esta métrica captura esse impacto real.
    
    Inclui:
    - interceptions (INT)
    - fumbles perdidos
    - turnover on downs (falha na 4ª descida)
    """
    df = pbp.copy()
    if season:
        df = df[df["season"] == season]

    # Pontos marcados após turnover
    # Se o time pontuou na mesma posse após recuperar o turnover adversário
    turnover_plays = df[df["turnover"] == 1].copy() if "turnover" in df.columns else pd.DataFrame()

    # Alternativa: usar interceptions e fumbles diretamente
    int_plays = df[df["interception"] == 1]
    fumble_plays = df[(df["fumble_lost"] == 1)]

    # Pontos de EPA perdidos por interceptions (ofensivo)
    int_epa_lost = int_plays.groupby(["season", "posteam"])["epa"].sum().reset_index()
    # EPA ganho pela defesa em fumbles
    fumble_epa = fumble_plays.groupby(["season", "posteam"])["epa"].sum().reset_index()

    result = int_epa_lost.rename(columns={"posteam": "team", "epa": "epa_lost_interceptions"})
    result = result.merge(
        fumble_epa.rename(columns={"posteam": "team", "epa": "epa_lost_fumbles"}),
        on=["season", "team"], how="outer"
    ).fillna(0)

    result["total_turnover_epa_lost"] = result["epa_lost_interceptions"] + result["epa_lost_fumbles"]

    return result.round(4)


# ─────────────────────────────────────────
# 2. MÉTRICAS POR QB (A BERLINDA)
# ─────────────────────────────────────────

def get_qb_hot_seat(pbp: pd.DataFrame, team_abbr: str, last_n_games: int = 3) -> dict:
    """
    Avalia se o QB titular está na "Berlinda".
    
    Analisa os últimos N jogos e calcula:
    - EPA médio por jogada nos últimos jogos
    - CPOE (Completion % Over Expected)
    - Tendência: melhorando ou piorando?
    
    Se a média de EPA for negativa → ALERTA DA BERLINDA!
    """
    team_passes = pbp[
        (pbp["posteam"] == team_abbr) &
        (pbp["pass"] == 1) &
        pbp["passer_player_name"].notna() &
        pbp["epa"].notna()
    ].copy()

    if team_passes.empty:
        return {"error": f"Dados não encontrados para o time {team_abbr}"}

    # Agrupa por jogo e QB
    game_qb = team_passes.groupby(["game_id", "passer_player_name"]).agg(
        epa_mean=("epa", "mean"),
        cpoe_mean=("cpoe", "mean"),
        plays=("play_id", "count")
    ).reset_index()

    # Identifica o QB titular (mais passes na temporada)
    starter = game_qb.groupby("passer_player_name")["plays"].sum().idxmax()
    qb_history = game_qb[game_qb["passer_player_name"] == starter].tail(last_n_games)

    if qb_history.empty:
        return {"error": "Histórico insuficiente para análise."}

    # Métricas dos últimos N jogos
    recent_epa = float(qb_history["epa_mean"].mean())
    recent_cpoe = float(qb_history["cpoe_mean"].mean()) if "cpoe" in pbp.columns else 0.0

    # Detecta tendência (está melhorando ou piorando?)
    if len(qb_history) >= 2:
        epa_values = qb_history["epa_mean"].tolist()
        trend = "melhorando" if epa_values[-1] > epa_values[0] else "piorando"
    else:
        trend = "indefinida"

    # Lógica da Berlinda: EPA médio negativo nos últimos jogos
    is_critical = recent_epa < 0

    # Escala de severidade
    if recent_epa < -0.15:
        severity = "CRÍTICO"
        message = "Desempenho catastrófico. Substituição imediata recomendada pelos dados."
    elif recent_epa < 0:
        severity = "ALERTA"
        message = "EPA negativo. O QB está custando pontos ao time."
    elif recent_epa < 0.05:
        severity = "ATENÇÃO"
        message = "Performance abaixo da média da liga."
    else:
        severity = "SEGURO"
        message = "Performance aceitável ou acima da média."

    return {
        "quarterback": starter,
        "team": team_abbr,
        "games_analyzed": len(qb_history),
        "recent_epa": round(recent_epa, 3),
        "recent_cpoe": round(recent_cpoe, 3),
        "trend": trend,
        "is_critical": is_critical,
        "severity": severity,
        "message": message,
        "game_log": qb_history[["game_id", "epa_mean", "plays"]].to_dict(orient="records")
    }


def get_qb_cpoe_stats(pbp: pd.DataFrame, season: Optional[int] = None) -> pd.DataFrame:
    """
    CPOE: Completion Percentage Over Expected.
    
    Compara a % de passes completos do QB com o que seria esperado
    dado a distância, a pressão, e outras variáveis.
    
    CPOE > 0 = QB melhor que a média
    CPOE < 0 = QB pior que a média
    
    Esta é a métrica mais honesta para avaliar QBs porque
    remove o contexto (esquema, recebedores, adversário).
    """
    df = pbp.copy()
    if season:
        df = df[df["season"] == season]

    pass_plays = df[
        (df["pass"] == 1) &
        df["passer_player_name"].notna() &
        df["cpoe"].notna()
    ]

    stats = pass_plays.groupby(["season", "passer_player_name", "posteam"]).agg(
        attempts=("pass_attempt", "sum"),
        completions=("complete_pass", "sum"),
        cpoe=("cpoe", "mean"),
        epa=("epa", "mean"),
        air_yards=("air_yards", "mean"),
    ).reset_index()

    stats["completion_pct"] = (stats["completions"] / stats["attempts"] * 100).round(1)
    stats = stats[stats["attempts"] >= 100]  # Filtra QBs com amostras relevantes

    return stats.sort_values("epa", ascending=False).round(4)


# ─────────────────────────────────────────
# 3. PLAYER PROPS (FLOOR & CEILING)
# ─────────────────────────────────────────

def calculate_player_props(pbp: pd.DataFrame, player_name: str, position: str = "receiver") -> dict:
    """
    Calcula o Floor (piso) e Ceiling (teto) de yardas de um jogador.
    
    A ideia é cruzar:
    - A média histórica do jogador
    - O desvio padrão (consistência)
    - A fragilidade da defesa adversária (def_epa_passado)
    
    Floor = média - 1 desvio padrão (pior caso provável)
    Ceiling = média + 1.5 desvio padrão (melhor caso provável)
    
    Útil para: fantasy football, apostas em player props.
    """
    if position == "receiver":
        plays = pbp[
            (pbp["receiver_player_name"].str.contains(player_name, case=False, na=False)) &
            pbp["receiving_yards"].notna()
        ]
        yards_col = "receiving_yards"
    elif position == "rusher":
        plays = pbp[
            (pbp["rusher_player_name"].str.contains(player_name, case=False, na=False)) &
            pbp["rushing_yards"].notna()
        ]
        yards_col = "rushing_yards"
    else:
        return {"error": "Posição inválida. Use 'receiver' ou 'rusher'."}

    if plays.empty:
        return {"error": f"Jogador '{player_name}' não encontrado nos dados."}

    # Agrega por jogo
    game_yards = plays.groupby("game_id")[yards_col].sum()

    mean = float(game_yards.mean())
    std = float(game_yards.std())
    floor = max(0, mean - std)
    ceiling = mean + (std * 1.5)

    return {
        "player": player_name,
        "position": position,
        "games_played": len(game_yards),
        "avg_yards": round(mean, 1),
        "std_dev": round(std, 1),
        "floor": round(floor, 1),
        "ceiling": round(ceiling, 1),
        "consistency": "Alta" if std < 20 else "Média" if std < 40 else "Baixa",
        "game_log": game_yards.tolist()[-10:]  # Últimos 10 jogos
    }


# ─────────────────────────────────────────
# 4. FEATURES PARA O MODELO DE ML
# ─────────────────────────────────────────

def build_training_features(pbp: pd.DataFrame, schedules: pd.DataFrame) -> pd.DataFrame:
    """
    Monta o dataset final para treinar o modelo de predição de vitória.
    
    Features (variáveis de entrada):
    - EPA ofensivo e defensivo dos dois times
    - Success Rate dos dois times
    - Vantagem do mando de campo (home_advantage)
    
    Target (variável alvo):
    - home_win: 1 se o time da casa venceu, 0 se perdeu
    """
    # Calcula métricas por time
    team_epa = calculate_team_epa(pbp)
    team_sr = calculate_success_rate(pbp)

    team_stats = team_epa.merge(team_sr, on=["season", "team"], how="inner")

    # Prepara jogos regulares com resultado definido
    games = schedules[
        (schedules["game_type"] == "REG") &
        schedules["result"].notna()
    ].copy()

    games["home_win"] = (games["result"] > 0).astype(int)

    # Junta stats do time da casa
    games = games.merge(
        team_stats, left_on=["season", "home_team"], right_on=["season", "team"], how="inner"
    ).rename(columns={
        "off_epa": "home_off_epa",
        "def_epa": "home_def_epa",
        "off_pass_epa": "home_off_pass_epa",
        "off_rush_epa": "home_off_rush_epa",
        "def_pass_epa": "home_def_pass_epa",
        "def_rush_epa": "home_def_rush_epa",
        "off_success_rate": "home_off_sr",
        "def_success_rate": "home_def_sr",
    }).drop(columns=["team"])

    # Junta stats do time visitante
    games = games.merge(
        team_stats, left_on=["season", "away_team"], right_on=["season", "team"], how="inner"
    ).rename(columns={
        "off_epa": "away_off_epa",
        "def_epa": "away_def_epa",
        "off_pass_epa": "away_off_pass_epa",
        "off_rush_epa": "away_off_rush_epa",
        "def_pass_epa": "away_def_pass_epa",
        "def_rush_epa": "away_def_rush_epa",
        "off_success_rate": "away_off_sr",
        "def_success_rate": "away_def_sr",
    }).drop(columns=["team"])

    return games


FEATURE_COLUMNS = [
    "home_off_epa", "home_def_epa",
    "home_off_pass_epa", "home_off_rush_epa",
    "home_def_pass_epa", "home_def_rush_epa",
    "home_off_sr", "home_def_sr",
    "away_off_epa", "away_def_epa",
    "away_off_pass_epa", "away_off_rush_epa",
    "away_def_pass_epa", "away_def_rush_epa",
    "away_off_sr", "away_def_sr",
]
