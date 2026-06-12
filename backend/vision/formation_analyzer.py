"""
Módulo 4 — Visão Computacional: Análise de Formações
======================================================
Analisa formações táticas da NFL usando:

1. Dados PBP (nfl_data_py): Frequência e EPA por formação
2. Gerador de diagramas de campo (matplotlib → PNG base64)
3. Classificador de imagens enviadas pelo usuário (OpenCV)

O approach combina:
- Analytics tradicional (formações vs EPA)
- Geração de visualizações sintéticas (campo com jogadores)
- Análise de imagens reais (detecção de padrões)
"""
import cv2
import numpy as np
import base64
import io
from typing import Optional
import matplotlib
matplotlib.use('Agg')  # Backend sem display
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Circle, Rectangle, FancyArrowPatch
import pandas as pd


# ─────────────────────────────────────────
# 0. PERSONNEL DEFENSIVO (parse + classificação)
# ─────────────────────────────────────────

# O pbp tem 2 formatos: agregado ("4 DL, 2 LB, 5 DB") e detalhado
# ("3 CB, 2 DE, 2 DT, 1 FS, 1 MLB, 1 OLB, 1 SS"). Mapeia posição → unidade.
_POS_UNIT = {
    "DL": "dl", "DE": "dl", "DT": "dl", "NT": "dl",
    "LB": "lb", "MLB": "lb", "OLB": "lb", "ILB": "lb",
    "DB": "db", "CB": "db", "FS": "db", "SS": "db", "S": "db",
}


def parse_defense_personnel(value) -> Optional[dict]:
    """'4 DL, 2 LB, 5 DB' → {'dl': 4, 'lb': 2, 'db': 5}. Inválido → None."""
    if not isinstance(value, str) or not value.strip():
        return None
    counts = {"dl": 0, "lb": 0, "db": 0}
    found = False
    for token in value.split(","):
        parts = token.strip().split()
        if len(parts) != 2 or not parts[0].isdigit():
            continue
        unit = _POS_UNIT.get(parts[1].upper())
        if unit:
            counts[unit] += int(parts[0])
            found = True
    return counts if found else None


# ─────────────────────────────────────────
# 1. ANÁLISE DE FORMAÇÕES DOS DADOS PBP
# ─────────────────────────────────────────

def analyze_formations_from_pbp(pbp: pd.DataFrame, team: Optional[str] = None) -> dict:
    """
    Analisa a frequência e eficiência (EPA) de cada formação ofensiva
    baseado nos dados play-by-play.

    nfl_data_py tem as colunas:
    - shotgun: 1 se o QB está em shotgun
    - no_huddle: 1 se sem huddle
    - qb_dropback: 1 se o QB fez dropback para passe

    Derivamos a formação a partir dessas flags.
    """
    df = pbp.copy()
    if team:
        df = df[df["posteam"] == team.upper()]

    # Apenas jogadas de passe/corrida com EPA válido
    plays = df[
        ((df["pass"] == 1) | (df["rush"] == 1)) &
        df["epa"].notna() &
        df["posteam"].notna()
    ].copy()

    if plays.empty:
        return {"error": "Dados insuficientes para análise de formações."}

    # Classifica a formação
    def classify_formation(row):
        shotgun = row.get("shotgun", 0) == 1
        no_huddle = row.get("no_huddle", 0) == 1
        is_pass = row.get("pass", 0) == 1
        is_rush = row.get("rush", 0) == 1

        if shotgun and no_huddle:
            return "Hurry-Up Shotgun"
        elif shotgun and is_pass:
            return "Shotgun (Passe)"
        elif shotgun and is_rush:
            return "Shotgun (Corrida)"
        elif not shotgun and is_pass:
            return "Under Center (Passe)"
        elif not shotgun and is_rush:
            return "Under Center (Corrida)"
        else:
            return "Outra"

    plays["formation"] = plays.apply(classify_formation, axis=1)

    # Agrega por formação
    formation_stats = plays.groupby("formation").agg(
        plays_count=("play_id", "count"),
        epa_mean=("epa", "mean"),
        epa_total=("epa", "sum"),
        success_rate=("success", "mean"),
    ).reset_index()

    total_plays = len(plays)
    formation_stats["usage_pct"] = (formation_stats["plays_count"] / total_plays * 100).round(1)
    formation_stats = formation_stats.sort_values("plays_count", ascending=False)

    # Para o gráfico de barras no frontend
    chart_data = {
        "labels": formation_stats["formation"].tolist(),
        "epa": formation_stats["epa_mean"].round(4).tolist(),
        "usage": formation_stats["usage_pct"].tolist(),
        "plays": formation_stats["plays_count"].tolist(),
        "success_rate": (formation_stats["success_rate"] * 100).round(1).tolist(),
    }

    # Insight automático
    best = formation_stats.loc[formation_stats["epa_mean"].idxmax()]
    worst = formation_stats.loc[formation_stats["epa_mean"].idxmin()]

    insight = (
        f"Formação mais eficiente: **{best['formation']}** "
        f"(EPA: {best['epa_mean']:.3f}, {best['usage_pct']:.1f}% das jogadas). "
        f"Formação menos eficiente: **{worst['formation']}** "
        f"(EPA: {worst['epa_mean']:.3f})."
    )

    return {
        "team": team or "Liga Toda",
        "total_plays": total_plays,
        "formations": formation_stats.to_dict(orient="records"),
        "chart": chart_data,
        "insight": insight,
    }


# ─────────────────────────────────────────
# 2. GERADOR DE DIAGRAMAS DE CAMPO
# ─────────────────────────────────────────

# Coordenadas dos jogadores por formação (x=lateral, y=profundidade)
FORMATION_TEMPLATES = {
    "Shotgun Pro Set": {
        "offense": [
            # Offensive Line
            {"x": 0, "y": 0, "pos": "C", "color": "#1565c0"},
            {"x": -1.3, "y": 0, "pos": "LG", "color": "#1565c0"},
            {"x": 1.3, "y": 0, "pos": "RG", "color": "#1565c0"},
            {"x": -2.7, "y": 0, "pos": "LT", "color": "#1565c0"},
            {"x": 2.7, "y": 0, "pos": "RT", "color": "#1565c0"},
            # QB em shotgun
            {"x": 0, "y": -4.5, "pos": "QB", "color": "#e53935"},
            # RB ao lado do QB
            {"x": 1.5, "y": -4.5, "pos": "RB", "color": "#43a047"},
            # TE
            {"x": 3.8, "y": 0, "pos": "TE", "color": "#fb8c00"},
            # WRs
            {"x": -6, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
            {"x": -5, "y": -1, "pos": "Slot", "color": "#8e24aa"},
        ],
        "description": "Formação padrão moderna. QB recebe em shotgun com 5 jardas de profundidade. 3 WRs, 1 TE, 1 RB.",
    },
    "I-Formation": {
        "offense": [
            {"x": 0, "y": 0, "pos": "C", "color": "#1565c0"},
            {"x": -1.3, "y": 0, "pos": "LG", "color": "#1565c0"},
            {"x": 1.3, "y": 0, "pos": "RG", "color": "#1565c0"},
            {"x": -2.7, "y": 0, "pos": "LT", "color": "#1565c0"},
            {"x": 2.7, "y": 0, "pos": "RT", "color": "#1565c0"},
            # QB sob o centro
            {"x": 0, "y": -1.5, "pos": "QB", "color": "#e53935"},
            # FB e RB em fila (I-Formation)
            {"x": 0, "y": -3.5, "pos": "FB", "color": "#00acc1"},
            {"x": 0, "y": -5.5, "pos": "RB", "color": "#43a047"},
            # TE e WRs
            {"x": 3.8, "y": 0, "pos": "TE", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
        ],
        "description": "Formação clássica de corrida. QB sob o centro, FB abre o buraco, RB segue atrás. Favorece play action.",
    },
    "Empty Backfield": {
        "offense": [
            {"x": 0, "y": 0, "pos": "C", "color": "#1565c0"},
            {"x": -1.3, "y": 0, "pos": "LG", "color": "#1565c0"},
            {"x": 1.3, "y": 0, "pos": "RG", "color": "#1565c0"},
            {"x": -2.7, "y": 0, "pos": "LT", "color": "#1565c0"},
            {"x": 2.7, "y": 0, "pos": "RT", "color": "#1565c0"},
            # QB sozinho em shotgun
            {"x": 0, "y": -4.5, "pos": "QB", "color": "#e53935"},
            # 5 recebedores!
            {"x": -6, "y": 0.5, "pos": "WR1", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR2", "color": "#8e24aa"},
            {"x": -4.5, "y": -1, "pos": "WR3", "color": "#8e24aa"},
            {"x": 4.5, "y": -1, "pos": "WR4", "color": "#8e24aa"},
            {"x": 3.8, "y": 0, "pos": "TE", "color": "#fb8c00"},
        ],
        "description": "Backfield vazio. Cinco recebedores no campo. Força a defesa a cobrir tudo. Vulnerável ao blitz.",
    },
    "Cover 2 (Defesa)": {
        "offense": [
            {"x": 0, "y": 0, "pos": "C", "color": "#1565c0"},
            {"x": -2.7, "y": 0, "pos": "LT", "color": "#1565c0"},
            {"x": 2.7, "y": 0, "pos": "RT", "color": "#1565c0"},
            {"x": 0, "y": -4.5, "pos": "QB", "color": "#e53935"},
            {"x": -6, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "color": "#8e24aa"},
        ],
        "defense": [
            # 4-3 base
            {"x": -2, "y": 1.5, "pos": "DT", "color": "#d32f2f"},
            {"x": 0.5, "y": 1.5, "pos": "DT", "color": "#d32f2f"},
            {"x": -4, "y": 1.5, "pos": "DE", "color": "#d32f2f"},
            {"x": 3, "y": 1.5, "pos": "DE", "color": "#d32f2f"},
            # LBs
            {"x": -2, "y": 3.5, "pos": "LB", "color": "#f57c00"},
            {"x": 0.5, "y": 3.5, "pos": "MLB", "color": "#f57c00"},
            {"x": 3, "y": 3.5, "pos": "LB", "color": "#f57c00"},
            # Cover 2: 2 safeties profundos, CBs na linha
            {"x": -7, "y": 2, "pos": "CB", "color": "#2e7d32"},
            {"x": 7, "y": 2, "pos": "CB", "color": "#2e7d32"},
            {"x": -3.5, "y": 7, "pos": "FS", "color": "#1b5e20"},
            {"x": 3.5, "y": 7, "pos": "SS", "color": "#1b5e20"},
        ],
        "description": "Cover 2: dois safeties dividem o campo profundo ao meio. CBs cobrem as laterais. Fraqueza: meio do campo aberto.",
    },
}


def generate_formation_diagram(formation_name: str, theme: str = "dark") -> str:
    """
    Gera um diagrama de campo com as posições dos jogadores.
    Retorna a imagem como string base64 (PNG).

    Args:
        formation_name: Nome da formação (chave de FORMATION_TEMPLATES)
        theme: 'dark' ou 'light'

    Returns:
        String base64 da imagem PNG
    """
    template = FORMATION_TEMPLATES.get(formation_name)
    if not template:
        return None

    # Configuração visual
    bg_color = "#0b0f1a" if theme == "dark" else "#f1f8e9"
    field_color = "#0d2e0d" if theme == "dark" else "#2e7d32"
    line_color = "#ffffff" if theme == "dark" else "#000000"
    text_color = "white" if theme == "dark" else "black"

    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(field_color)

    # Dimensões do campo (zona visível)
    ax.set_xlim(-10, 10)
    ax.set_ylim(-8, 12)
    ax.set_aspect("equal")

    # Linhas do campo
    # Linha de scrimmage
    ax.axhline(y=0, color="white", linewidth=2, alpha=0.8, linestyle="-")
    ax.text(-9.5, 0.3, "SCRIMMAGE", color="white", fontsize=7, alpha=0.6)

    # Linhas de 5 jardas (atrás e frente)
    for y in [-5, 5, 10]:
        ax.axhline(y=y, color="white", linewidth=0.5, alpha=0.3, linestyle="--")

    # Hash marks
    for y in range(-7, 12):
        ax.plot([-1, -0.7], [y, y], color="white", linewidth=0.5, alpha=0.3)
        ax.plot([0.7, 1], [y, y], color="white", linewidth=0.5, alpha=0.3)

    # Desenha os jogadores ofensivos
    for player in template.get("offense", []):
        circle = Circle(
            (player["x"], player["y"]),
            radius=0.5,
            color=player["color"],
            zorder=5,
            linewidth=1.5,
            edgecolor="white",
        )
        ax.add_patch(circle)
        ax.text(
            player["x"], player["y"],
            player["pos"],
            ha="center", va="center",
            color="white", fontsize=7, fontweight="bold",
            zorder=6,
        )

    # Desenha os jogadores defensivos (se houver)
    for player in template.get("defense", []):
        # Defesa: triângulo para diferenciar
        triangle = plt.Polygon(
            [
                [player["x"], player["y"] + 0.55],
                [player["x"] - 0.5, player["y"] - 0.35],
                [player["x"] + 0.5, player["y"] - 0.35],
            ],
            color=player["color"],
            zorder=5,
            linewidth=1.5,
            edgecolor="white",
        )
        ax.add_patch(triangle)
        ax.text(
            player["x"], player["y"] + 0.05,
            player["pos"],
            ha="center", va="center",
            color="white", fontsize=6, fontweight="bold",
            zorder=6,
        )

    # Título e informação
    ax.set_title(
        formation_name,
        color="white" if theme == "dark" else "black",
        fontsize=14,
        fontweight="bold",
        pad=10,
    )

    # Legenda
    if template.get("defense"):
        legend_elements = [
            mpatches.Patch(color="#1565c0", label="OL (Ataque)"),
            mpatches.Patch(color="#e53935", label="QB"),
            mpatches.Patch(color="#8e24aa", label="WR"),
            mpatches.Patch(color="#d32f2f", label="DL (Defesa)"),
            mpatches.Patch(color="#2e7d32", label="CB"),
            mpatches.Patch(color="#1b5e20", label="Safety"),
        ]
    else:
        legend_elements = [
            mpatches.Patch(color="#1565c0", label="OL"),
            mpatches.Patch(color="#e53935", label="QB"),
            mpatches.Patch(color="#43a047", label="RB"),
            mpatches.Patch(color="#8e24aa", label="WR"),
            mpatches.Patch(color="#fb8c00", label="TE"),
        ]

    ax.legend(
        handles=legend_elements,
        loc="lower right",
        fontsize=7,
        framealpha=0.3,
        facecolor=bg_color,
        labelcolor=text_color,
    )

    ax.axis("off")
    plt.tight_layout()

    # Converte para base64
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=120, facecolor=bg_color)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)

    return img_base64


# ─────────────────────────────────────────
# 3. ANÁLISE DE IMAGEM ENVIADA PELO USUÁRIO
# ─────────────────────────────────────────

def analyze_uploaded_image(image_bytes: bytes) -> dict:
    """
    Analisa uma imagem enviada pelo usuário para detectar padrões
    que possam indicar uma formação de futebol americano.

    Técnicas:
    - Detecção de círculos (HoughCircles): representa jogadores no campo
    - Análise de cores para identificar times
    - Estimativa de padrão de distribuição (espalhado = shotgun, agrupado = under center)

    Args:
        image_bytes: Bytes da imagem (PNG/JPEG)

    Returns:
        dict com análise da formação detectada
    """
    # Decodifica a imagem
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Imagem inválida ou corrompida."}

    height, width = img.shape[:2]

    # Converte para grayscale para detecção de círculos
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)

    # Detecta círculos (jogadores no diagrama)
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=20,
        param1=50,
        param2=30,
        minRadius=8,
        maxRadius=40,
    )

    if circles is None:
        return {
            "circles_detected": 0,
            "formation_estimate": "Não detectada",
            "confidence": "Baixa",
            "note": "Nenhum jogador (círculo) detectado. Tente com um diagrama mais claro.",
            "image_size": {"width": width, "height": height},
        }

    circles = np.round(circles[0, :]).astype("int")
    num_players = len(circles)

    # Análise de distribuição
    # Se os jogadores estão espalhados horizontalmente → shotgun/spread
    # Se agrupados → under center / power
    if num_players > 0:
        x_positions = [c[0] for c in circles]
        y_positions = [c[1] for c in circles]
        x_spread = np.std(x_positions) / width  # Normalizado por largura
        y_spread = np.std(y_positions) / height

        # Classificação baseada em spread
        if x_spread > 0.25:
            if num_players >= 10:
                formation = "Shotgun / Spread (Alto espalhamento lateral)"
            else:
                formation = "Possível formação de passe"
        elif x_spread < 0.12:
            formation = "I-Formation / Power (Agrupado)"
        else:
            formation = "Formação mista / Pro Set"

        # Detecta se há dois grupos (linha ofensiva + recebedores)
        y_unique = len(set([round(y / 20) * 20 for y in y_positions]))
        if y_unique >= 3:
            confidence = "Média"
        else:
            confidence = "Baixa"
    else:
        formation = "Não detectada"
        confidence = "Muito baixa"
        x_spread = 0
        y_spread = 0

    return {
        "circles_detected": num_players,
        "formation_estimate": formation,
        "confidence": confidence,
        "spatial_analysis": {
            "horizontal_spread": round(float(x_spread), 3),
            "vertical_spread": round(float(y_spread), 3),
        },
        "image_size": {"width": width, "height": height},
        "player_positions": [{"x": int(c[0]), "y": int(c[1]), "radius": int(c[2])} for c in circles[:15]],
        "note": "Análise baseada em detecção de círculos (OpenCV HoughCircles). Para maior precisão, use diagramas com jogadores representados por círculos claros.",
    }
