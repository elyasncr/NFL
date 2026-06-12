"""Testes do Módulo 4 — formation_analyzer. Sem rede: tudo com dados sintéticos."""
import pytest
import numpy as np
import pandas as pd

from vision.formation_analyzer import parse_defense_personnel, classify_db_package, analyze_team_formations


# ─── parse_defense_personnel ───

def test_parse_personnel_formato_agregado():
    assert parse_defense_personnel("4 DL, 2 LB, 5 DB") == {"dl": 4, "lb": 2, "db": 5}


def test_parse_personnel_formato_detalhado():
    # CB/FS/SS contam como DB; DE/DT como DL; MLB/OLB como LB
    result = parse_defense_personnel("3 CB, 2 DE, 2 DT, 1 FS, 1 MLB, 1 OLB, 1 SS")
    assert result == {"dl": 4, "lb": 2, "db": 5}


def test_parse_personnel_invalido():
    assert parse_defense_personnel(None) is None
    assert parse_defense_personnel(float("nan")) is None
    assert parse_defense_personnel("texto qualquer") is None
    assert parse_defense_personnel("") is None


# ─── classify_db_package ───

@pytest.mark.parametrize("db,expected", [
    (4, "BASE"), (5, "NICKEL"), (6, "DIME"), (7, "DIME"),
    (3, "OUTROS"), (None, "OUTROS"),
])
def test_classify_db_package(db, expected):
    assert classify_db_package(db) == expected


# ─── analyze_team_formations: ataque ───

def _off_row(team, formation, epa, success=1, defteam="DEN"):
    return {
        "posteam": team, "defteam": defteam, "pass": 1, "rush": 0,
        "epa": epa, "success": success, "offense_formation": formation,
        "defense_coverage_type": None, "defense_personnel": None,
        "defenders_in_box": np.nan, "number_of_pass_rushers": np.nan,
    }


@pytest.fixture
def pbp_ofensivo():
    rows = (
        [_off_row("KC", "SHOTGUN", 0.1) for _ in range(30)]
        + [_off_row("KC", "PISTOL", -0.1, success=0) for _ in range(10)]
        + [_off_row("KC", None, 0.0) for _ in range(5)]        # sem tag
        + [_off_row("DEN", "SHOTGUN", 0.3, defteam="KC") for _ in range(20)]
    )
    return pd.DataFrame(rows)


def test_ataque_agrega_por_formacao_real(pbp_ofensivo):
    result = analyze_team_formations(pbp_ofensivo, team="KC")
    off = result["offense"]
    assert off["total_plays"] == 45          # 30 + 10 + 5 (DEN fora)
    assert off["tagged_plays"] == 40         # 5 sem tag ficam fora

    shotgun = off["formations"][0]           # ordenado por uso
    assert shotgun["tag"] == "SHOTGUN"
    assert shotgun["label"] == "Shotgun"
    assert shotgun["usage_pct"] == 75.0      # 30/40
    assert shotgun["plays"] == 30
    assert shotgun["epa_mean"] == pytest.approx(0.1)
    assert shotgun["success_rate"] == 100.0
    assert shotgun["small_sample"] is False

    pistol = off["formations"][1]
    assert pistol["tag"] == "PISTOL"
    assert pistol["usage_pct"] == 25.0
    assert pistol["small_sample"] is True    # 10 < 20


def test_liga_toda_sem_filtro(pbp_ofensivo):
    result = analyze_team_formations(pbp_ofensivo)
    assert result["team"] == "Liga Toda"
    assert result["offense"]["total_plays"] == 65


def test_time_sem_jogadas_retorna_erro(pbp_ofensivo):
    result = analyze_team_formations(pbp_ofensivo, team="SEA")
    assert "error" in result
