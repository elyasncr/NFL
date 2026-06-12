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
from functools import lru_cache
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


def classify_db_package(db_count) -> str:
    """Nº de DBs em campo → pacote: 4=BASE, 5=NICKEL, 6+=DIME, resto=OUTROS."""
    if db_count is None:
        return "OUTROS"
    if db_count == 4:
        return "BASE"
    if db_count == 5:
        return "NICKEL"
    if db_count >= 6:
        return "DIME"
    return "OUTROS"


# Labels PT pras tags reais do pbp (offense_formation)
TAG_LABELS = {
    "SHOTGUN": "Shotgun",
    "UNDER CENTER": "Under Center",
    "SINGLEBACK": "Singleback",
    "PISTOL": "Pistol",
    "EMPTY": "Empty",
    "I_FORM": "I-Formation",
    "JUMBO": "Jumbo",
    "WILDCAT": "Wildcat",
}

COVERAGE_LABELS = {
    "COVER_0": "Cover 0",
    "COVER_1": "Cover 1",
    "COVER_2": "Cover 2",
    "COVER_3": "Cover 3",
    "COVER_4": "Cover 4 (Quarters)",
    "COVER_6": "Cover 6",
    "2_MAN": "2-Man",
    "OUTRAS": "Outras",
}

SMALL_SAMPLE_THRESHOLD = 20

# Placeholders — preenchidos com templates reais nas Tasks 5 e 6.
COVERAGE_TEMPLATES: dict = {}


def _ol(extra_left: bool = False) -> list:
    """Linha ofensiva padrão de 5 (+ tackle extra opcional pro Jumbo)."""
    ol = [
        {"x": 0, "y": 0, "pos": "C", "unit": "ol", "color": "#1565c0"},
        {"x": -1.3, "y": 0, "pos": "LG", "unit": "ol", "color": "#1565c0"},
        {"x": 1.3, "y": 0, "pos": "RG", "unit": "ol", "color": "#1565c0"},
        {"x": -2.7, "y": 0, "pos": "LT", "unit": "ol", "color": "#1565c0"},
        {"x": 2.7, "y": 0, "pos": "RT", "unit": "ol", "color": "#1565c0"},
    ]
    if extra_left:
        ol.append({"x": -4.0, "y": 0, "pos": "OT", "unit": "ol", "color": "#1565c0"})
    return ol


OFFENSE_FORMATION_TEMPLATES = {
    "SHOTGUN": {
        "label": "Shotgun",
        "description": "QB recebe o snap a ~5 jardas da bola. Base do ataque moderno: "
                       "facilita a leitura da defesa e o passe rápido. 3 WRs, 1 TE, 1 RB.",
        "offense": _ol() + [
            {"x": 0, "y": -4.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 1.5, "y": -4.5, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": -4.5, "y": -1, "pos": "Slot", "unit": "wr", "color": "#8e24aa"},
        ],
    },
    "UNDER CENTER": {
        "label": "Under Center",
        "description": "QB colado no center com dois backs divididos atrás (pro set). "
                       "Desenho clássico: forte na corrida e no play action.",
        "offense": _ol() + [
            {"x": 0, "y": -1.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": -1.8, "y": -4.2, "pos": "HB", "unit": "back", "color": "#43a047"},
            {"x": 1.8, "y": -3.6, "pos": "FB", "unit": "back", "color": "#00acc1"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
        ],
    },
    "SINGLEBACK": {
        "label": "Singleback",
        "description": "Um único RB fundo atrás do QB under center. Formação equilibrada: "
                       "corre e passa do mesmo desenho, difícil de antecipar.",
        "offense": _ol() + [
            {"x": 0, "y": -1.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 0, "y": -5, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": -4.5, "y": -1, "pos": "Slot", "unit": "wr", "color": "#8e24aa"},
        ],
    },
    "PISTOL": {
        "label": "Pistol",
        "description": "Híbrido: QB a ~3 jardas (mais raso que shotgun) com o RB logo atrás. "
                       "Mantém a corrida norte-sul viva sem abrir mão da leitura de passe.",
        "offense": _ol() + [
            {"x": 0, "y": -3, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 0, "y": -5.2, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 4.5, "y": -1, "pos": "Slot", "unit": "wr", "color": "#8e24aa"},
        ],
    },
    "EMPTY": {
        "label": "Empty",
        "description": "Backfield vazio: QB sozinho e cinco recebedores abertos. Força a defesa "
                       "a cobrir o campo todo, mas deixa o QB vulnerável ao blitz.",
        "offense": _ol() + [
            {"x": 0, "y": -4.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": -4.5, "y": -1, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 4.5, "y": -1, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
        ],
    },
    "I_FORM": {
        "label": "I-Formation",
        "description": "FB e RB em fila atrás do QB under center — o 'I'. Clássica de corrida: "
                       "o FB abre o buraco e o RB segue. Ótima pra play action.",
        "offense": _ol() + [
            {"x": 0, "y": -1.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 0, "y": -3.5, "pos": "FB", "unit": "back", "color": "#00acc1"},
            {"x": 0, "y": -5.5, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": -6, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
        ],
    },
    "JUMBO": {
        "label": "Jumbo",
        "description": "Pacote de força pra curta distância e goal line: linha extra, 2 TEs, "
                       "FB e RB. Todo mundo sabe que vem corrida — e mesmo assim funciona.",
        "offense": _ol(extra_left=True) + [
            {"x": 0, "y": -1.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 0, "y": -3.2, "pos": "FB", "unit": "back", "color": "#00acc1"},
            {"x": 0, "y": -5, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": -5.2, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": 4, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
        ],
    },
    "WILDCAT": {
        "label": "Wildcat",
        "description": "O snap vai direto pro RB; o QB abre como recebedor. Aposta total "
                       "na corrida com um bloqueador a mais e elemento surpresa.",
        "offense": _ol() + [
            {"x": 0, "y": -4.5, "pos": "RB", "unit": "back", "color": "#43a047"},
            {"x": -7, "y": -0.5, "pos": "QB", "unit": "qb", "color": "#e53935"},
            {"x": 3, "y": -1.2, "pos": "Jet", "unit": "back", "color": "#00acc1"},
            {"x": -3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": 3.8, "y": 0, "pos": "TE", "unit": "te", "color": "#fb8c00"},
            {"x": 6.5, "y": 0.5, "pos": "WR", "unit": "wr", "color": "#8e24aa"},
        ],
    },
}


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


def _offense_insight(formations: list) -> str:
    if not formations:
        return "Sem jogadas com tag de formação nesse filtro."
    top = formations[0]
    relevant = [f for f in formations if f["usage_pct"] >= 5]
    best = max(relevant, key=lambda f: f["epa_mean"]) if relevant else top
    return (
        f"**{top['label']}** foi a formação mais usada ({top['usage_pct']}% das jogadas). "
        f"A mais eficiente (uso ≥5%) foi **{best['label']}** (EPA {best['epa_mean']:+.3f}/jogada)."
    )


def _coverage_insight(items: list) -> str:
    if not items:
        return "Sem jogadas com tag de cobertura nesse filtro."
    top = items[0]
    first = f"Cobertura mais usada: **{top['label']}** ({top['usage_pct']}% dos passes defendidos)."
    relevant = [i for i in items if i["usage_pct"] >= 5 and i["tag"] != "OUTRAS"]
    if not relevant:
        return first
    best = min(relevant, key=lambda i: i["epa_allowed"])
    return (
        f"{first} Melhor EPA permitido (uso ≥5%): "
        f"**{best['label']}** ({best['epa_allowed']:+.3f} — menor é melhor)."
    )


def analyze_team_formations(pbp: pd.DataFrame, team: Optional[str] = None) -> dict:
    """
    Visão por time: formações ofensivas reais (offense_formation) +
    defesa (coberturas + personnel). team=None → liga toda.
    """
    team = team.upper() if team else None

    # ── ATAQUE ──
    off = pbp[pbp["posteam"] == team] if team else pbp
    off_plays = off[
        ((off["pass"] == 1) | (off["rush"] == 1))
        & off["epa"].notna()
        & off["posteam"].notna()
    ]
    if off_plays.empty:
        return {"error": "Sem jogadas pra esse filtro. Tenta outro time ou temporada."}

    tagged = off_plays[off_plays["offense_formation"].notna()]
    formations = []
    if not tagged.empty:
        grouped = (
            tagged.groupby("offense_formation")
            .agg(plays=("epa", "count"), epa_mean=("epa", "mean"), success_rate=("success", "mean"))
            .reset_index()
            .sort_values("plays", ascending=False)
        )
        total_tagged = len(tagged)
        for _, r in grouped.iterrows():
            tag = r["offense_formation"]
            formations.append({
                "tag": tag,
                "label": TAG_LABELS.get(tag, tag.title()),
                "usage_pct": round(r["plays"] / total_tagged * 100, 1),
                "plays": int(r["plays"]),
                "epa_mean": round(r["epa_mean"], 3),
                "success_rate": round(r["success_rate"] * 100, 1),
                "has_diagram": tag in OFFENSE_FORMATION_TEMPLATES,
                "small_sample": bool(r["plays"] < SMALL_SAMPLE_THRESHOLD),
            })

    return {
        "team": team or "Liga Toda",
        "offense": {
            "total_plays": len(off_plays),
            "tagged_plays": len(tagged),
            "formations": formations,
            "insight": _offense_insight(formations),
        },
        "defense": _analyze_defense(pbp, team),
    }


def _analyze_defense(pbp: pd.DataFrame, team: Optional[str]) -> dict:
    deff = pbp[pbp["defteam"] == team] if team else pbp
    def_plays = deff[((deff["pass"] == 1) | (deff["rush"] == 1)) & deff["epa"].notna()]

    # ── Coberturas (≈ jogadas de passe; EPA do ataque = EPA permitido) ──
    cov = def_plays[def_plays["defense_coverage_type"].notna()].copy()
    items = []
    if not cov.empty:
        cov["cov_group"] = cov["defense_coverage_type"].where(
            cov["defense_coverage_type"].isin(COVERAGE_LABELS), "OUTRAS"
        )
        cgrouped = (
            cov.groupby("cov_group")
            .agg(plays=("epa", "count"), epa_allowed=("epa", "mean"),
                 success_allowed=("success", "mean"))
            .reset_index()
            .sort_values("plays", ascending=False)
        )
        total_cov = len(cov)
        for _, r in cgrouped.iterrows():
            tag = r["cov_group"]
            items.append({
                "tag": tag,
                "label": COVERAGE_LABELS.get(tag, "Outras"),
                "usage_pct": round(r["plays"] / total_cov * 100, 1),
                "plays": int(r["plays"]),
                "epa_allowed": round(r["epa_allowed"], 3),
                "success_rate_allowed": round(r["success_allowed"] * 100, 1),
                "has_diagram": tag in COVERAGE_TEMPLATES,
                "small_sample": bool(r["plays"] < SMALL_SAMPLE_THRESHOLD),
            })

    # ── Personnel / front ──
    parsed = def_plays["defense_personnel"].map(parse_defense_personnel)
    valid = parsed.dropna()
    packages = valid.map(lambda p: classify_db_package(p["db"]))
    snaps = len(valid)

    def _pct(name: str) -> float:
        return round(float((packages == name).sum()) / snaps * 100, 1) if snaps else 0.0

    base_pct = _pct("BASE")
    nickel_pct = _pct("NICKEL")
    dime_pct = _pct("DIME")
    # OUTROS como resíduo: evita soma ≠ 100% por arredondamento independente
    other_pct = round(100.0 - base_pct - nickel_pct - dime_pct, 1) if snaps else 0.0

    box = def_plays["defenders_in_box"].dropna()
    rushers = def_plays.loc[def_plays["pass"] == 1, "number_of_pass_rushers"].dropna()

    return {
        "coverages": {
            "tagged_plays": len(cov),
            "items": items,
            "insight": _coverage_insight(items),
        },
        "personnel": {
            "base_pct": base_pct,
            "nickel_pct": nickel_pct,
            "dime_pct": dime_pct,
            "other_pct": other_pct,
            "avg_box": round(float(box.mean()), 1) if len(box) else None,
            "blitz_rate": round(float((rushers >= 5).mean()) * 100, 1) if len(rushers) else None,
            "snaps": snaps,
        },
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


def _player_color(player: dict, side: str, team_colors: Optional[dict]) -> str:
    """Cor do jogador: didática (default) ou cores do time quando informadas."""
    if team_colors and player.get("unit"):
        if side == "offense":
            return team_colors["secondary"] if player["unit"] == "qb" else team_colors["primary"]
        if player["unit"] == "db":
            return team_colors["secondary"]
        if player["unit"] in ("dl", "lb"):
            return team_colors["primary"]
    return player["color"]


def _render_diagram(template: dict, title: str, theme: str = "dark",
                    team_colors: Optional[dict] = None, side: str = "offense") -> str:
    """Renderiza um template (offense/defense) num campo matplotlib → PNG base64."""
    bg_color = "#0b0f1a" if theme == "dark" else "#f1f8e9"
    field_color = "#0d2e0d" if theme == "dark" else "#2e7d32"
    text_color = "white" if theme == "dark" else "black"

    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    fig.patch.set_facecolor(bg_color)
    ax.set_facecolor(field_color)
    ax.set_xlim(-10, 10)
    ax.set_ylim(-8, 12)
    ax.set_aspect("equal")

    ax.axhline(y=0, color="white", linewidth=2, alpha=0.8, linestyle="-")
    ax.text(-9.5, 0.3, "SCRIMMAGE", color="white", fontsize=7, alpha=0.6)
    for y in [-5, 5, 10]:
        ax.axhline(y=y, color="white", linewidth=0.5, alpha=0.3, linestyle="--")
    for y in range(-7, 12):
        ax.plot([-1, -0.7], [y, y], color="white", linewidth=0.5, alpha=0.3)
        ax.plot([0.7, 1], [y, y], color="white", linewidth=0.5, alpha=0.3)

    for player in template.get("offense", []):
        color = _player_color(player, "offense", team_colors if side == "offense" else None)
        circle = Circle((player["x"], player["y"]), radius=0.5, facecolor=color,
                        zorder=5, linewidth=1.5, edgecolor="white")
        ax.add_patch(circle)
        ax.text(player["x"], player["y"], player["pos"], ha="center", va="center",
                color="white", fontsize=7, fontweight="bold", zorder=6)

    for player in template.get("defense", []):
        color = _player_color(player, "defense", team_colors if side == "defense" else None)
        triangle = plt.Polygon(
            [[player["x"], player["y"] + 0.55],
             [player["x"] - 0.5, player["y"] - 0.35],
             [player["x"] + 0.5, player["y"] - 0.35]],
            facecolor=color, zorder=5, linewidth=1.5, edgecolor="white")
        ax.add_patch(triangle)
        ax.text(player["x"], player["y"] + 0.05, player["pos"], ha="center", va="center",
                color="white", fontsize=6, fontweight="bold", zorder=6)

    ax.set_title(title, color=text_color, fontsize=14, fontweight="bold", pad=10)

    if team_colors:
        if side == "offense":
            legend_elements = [
                mpatches.Patch(color=team_colors["primary"], label="Ataque"),
                mpatches.Patch(color=team_colors["secondary"], label="QB"),
            ]
        else:
            legend_elements = [
                mpatches.Patch(color=team_colors["primary"], label="Front 7"),
                mpatches.Patch(color=team_colors["secondary"], label="Secundária (DBs)"),
                mpatches.Patch(color="#5c6470", label="Ataque (referência)"),
            ]
    elif template.get("defense"):
        legend_elements = [
            mpatches.Patch(color="#d32f2f", label="DL (Defesa)"),
            mpatches.Patch(color="#f57c00", label="LB"),
            mpatches.Patch(color="#2e7d32", label="CB"),
            mpatches.Patch(color="#1b5e20", label="Safety"),
            mpatches.Patch(color="#5c6470", label="Ataque (referência)"),
        ]
    else:
        legend_elements = [
            mpatches.Patch(color="#1565c0", label="OL"),
            mpatches.Patch(color="#e53935", label="QB"),
            mpatches.Patch(color="#43a047", label="RB"),
            mpatches.Patch(color="#8e24aa", label="WR"),
            mpatches.Patch(color="#fb8c00", label="TE"),
        ]

    ax.legend(handles=legend_elements, loc="lower right", fontsize=7,
              framealpha=0.3, facecolor=bg_color, labelcolor=text_color)
    ax.axis("off")
    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=120, facecolor=bg_color)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return img_base64


def generate_formation_diagram(formation_name: str, theme: str = "dark") -> Optional[str]:
    """Endpoint legado: renderiza um template do FORMATION_TEMPLATES original."""
    template = FORMATION_TEMPLATES.get(formation_name)
    if not template:
        return None
    return _render_diagram(template, formation_name, theme=theme)


def _team_colors(team: Optional[str]) -> Optional[dict]:
    """Cores oficiais do time (lazy import pra evitar custo no boot)."""
    if not team:
        return None
    from ml.teams_info import get_teams_info
    for t in get_teams_info():
        if t["abbr"] == team.upper():
            return {"primary": t["color"], "secondary": t["color2"]}
    return None


# 512 ≈ domínio real (15 tags × 33 filtros de time × tema); PNGs ~150KB → teto ~75MB
@lru_cache(maxsize=512)
def generate_team_diagram(side: str, tag: str, team: Optional[str] = None,
                          theme: str = "dark") -> Optional[str]:
    """Diagrama por tag real do pbp, opcionalmente nas cores do time. Cacheado."""
    if side not in ("offense", "defense"):
        return None
    templates = OFFENSE_FORMATION_TEMPLATES if side == "offense" else COVERAGE_TEMPLATES
    template = templates.get(tag)
    if not template:
        return None
    title = template["label"] + (f" — {team.upper()}" if team else "")
    return _render_diagram(template, title, theme=theme,
                           team_colors=_team_colors(team), side=side)


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
