"""
Módulo de metadados dos 32 times atuais da NFL.
Combina nfl_data_py.import_team_desc() com lru_cache para servir nome,
cores oficiais e URL de logo (ESPN) sem reprocessar.
"""
from functools import lru_cache
import nfl_data_py as nfl


# 32 times atuais. Filtra fora STL/OAK/SD/LA legacy que aparecem no df do nflverse.
CURRENT_32_TEAMS = frozenset({
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
})


@lru_cache(maxsize=1)
def get_teams_info() -> list[dict]:
    """
    Retorna lista de 32 times com nome, cor primária, cor secundária e logo.
    Cacheado via lru_cache: 1ª chamada ~1-3s (download), próximas <1ms.
    """
    df = nfl.import_team_desc()
    df = df[df["team_abbr"].isin(CURRENT_32_TEAMS)].sort_values("team_abbr")

    teams = []
    for _, r in df.iterrows():
        full_name = r["team_name"]
        # "Kansas City Chiefs" → city="Kansas City", nick="Chiefs"
        city = full_name.rsplit(" ", 1)[0]
        teams.append({
            "abbr": r["team_abbr"],
            "name": full_name,
            "city": city,
            "nick": r["team_nick"],
            "conf": r["team_conf"],
            "division": r["team_division"],
            "color": r["team_color"],
            "color2": r["team_color2"],
            "logo": r["team_logo_espn"],
        })
    return teams
