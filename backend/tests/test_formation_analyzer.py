"""Testes do Módulo 4 — formation_analyzer. Sem rede: tudo com dados sintéticos."""
import pytest
import numpy as np
import pandas as pd

from vision.formation_analyzer import (
    parse_defense_personnel, classify_db_package, analyze_team_formations,
    generate_team_diagram, OFFENSE_FORMATION_TEMPLATES, COVERAGE_TEMPLATES,
    analyze_formations_from_pbp, compose_matchup_template,
)


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


# ─── analyze_team_formations: defesa ───

def _def_row(coverage, epa, personnel, box, rushers, success=1):
    return {
        "posteam": "DEN", "defteam": "KC", "pass": 1, "rush": 0,
        "epa": epa, "success": success, "offense_formation": None,
        "defense_coverage_type": coverage, "defense_personnel": personnel,
        "defenders_in_box": box, "number_of_pass_rushers": rushers,
    }


@pytest.fixture
def pbp_defensivo():
    rows = (
        [_def_row("COVER_3", 0.2, "4 DL, 2 LB, 5 DB", 6.0, 4.0) for _ in range(20)]
        + [_def_row("COMBO", -0.4, "2 DL, 3 LB, 6 DB", 7.0, 5.0, success=0) for _ in range(10)]
        # 2 jogadas ofensivas do KC só pra não cair no guard de "sem jogadas"
        + [_off_row("KC", "SHOTGUN", 0.1) for _ in range(2)]
    )
    return pd.DataFrame(rows)


def test_defesa_coberturas(pbp_defensivo):
    result = analyze_team_formations(pbp_defensivo, team="KC")
    cov = result["defense"]["coverages"]
    assert cov["tagged_plays"] == 30

    cover3 = cov["items"][0]
    assert cover3["tag"] == "COVER_3"
    assert cover3["label"] == "Cover 3"
    assert cover3["usage_pct"] == pytest.approx(66.7)
    assert cover3["plays"] == 20
    assert cover3["epa_allowed"] == pytest.approx(0.2)
    assert cover3["success_rate_allowed"] == 100.0
    assert cover3["small_sample"] is False

    outras = cov["items"][1]                  # COMBO agrupada
    assert outras["tag"] == "OUTRAS"
    assert outras["label"] == "Outras"
    assert outras["usage_pct"] == pytest.approx(33.3)
    assert outras["has_diagram"] is False
    assert outras["small_sample"] is True


def test_defesa_personnel(pbp_defensivo):
    result = analyze_team_formations(pbp_defensivo, team="KC")
    p = result["defense"]["personnel"]
    assert p["snaps"] == 30
    assert p["nickel_pct"] == pytest.approx(66.7)   # 20× "5 DB"
    assert p["dime_pct"] == pytest.approx(33.3)     # 10× "6 DB"
    assert p["base_pct"] == 0.0
    assert p["avg_box"] == pytest.approx(6.3)       # (20*6 + 10*7) / 30
    assert p["blitz_rate"] == pytest.approx(33.3)   # 10 de 30 com 5+ rushers


def test_coverage_insight_fallback_so_outras():
    from vision.formation_analyzer import _coverage_insight
    items = [{"tag": "OUTRAS", "label": "Outras", "usage_pct": 100.0, "epa_allowed": 0.1}]
    insight = _coverage_insight(items)
    assert "mais usada" in insight
    assert "Melhor EPA" not in insight


# ─── diagramas ───

OFFENSE_TAGS = ["SHOTGUN", "UNDER CENTER", "SINGLEBACK", "PISTOL",
                "EMPTY", "I_FORM", "JUMBO", "WILDCAT"]


def test_todas_tags_ofensivas_tem_template():
    assert sorted(OFFENSE_FORMATION_TEMPLATES.keys()) == sorted(OFFENSE_TAGS)


@pytest.mark.parametrize("tag", OFFENSE_TAGS)
def test_template_ofensivo_tem_11_jogadores(tag):
    assert len(OFFENSE_FORMATION_TEMPLATES[tag]["offense"]) == 11


@pytest.mark.parametrize("tag", OFFENSE_TAGS)
def test_template_ofensivo_renderiza(tag):
    img = generate_team_diagram("offense", tag)
    assert img is not None and len(img) > 1000   # base64 de PNG real


def test_tag_desconhecida_retorna_none():
    assert generate_team_diagram("offense", "INEXISTENTE") is None


def test_side_invalido_retorna_none():
    assert generate_team_diagram("special_teams", "SHOTGUN") is None


COVERAGE_TAGS = ["COVER_0", "COVER_1", "COVER_2", "COVER_3",
                 "COVER_4", "COVER_6", "2_MAN"]


def test_todas_coberturas_tem_template():
    assert sorted(COVERAGE_TEMPLATES.keys()) == sorted(COVERAGE_TAGS)


@pytest.mark.parametrize("tag", COVERAGE_TAGS)
def test_template_cobertura_renderiza(tag):
    img = generate_team_diagram("defense", tag)
    assert img is not None and len(img) > 1000


@pytest.mark.parametrize("tag", COVERAGE_TAGS)
def test_template_cobertura_tem_11_defensores(tag):
    assert len(COVERAGE_TEMPLATES[tag]["defense"]) == 11


# ─── cores do time ───

def test_diagrama_com_cores_do_time(monkeypatch):
    """Com team, o PNG muda (cores aplicadas). Mock evita rede do teams_info."""
    from vision import formation_analyzer as fa
    monkeypatch.setattr(
        fa, "_team_colors",
        lambda team: {"primary": "#ff0000", "secondary": "#00ff00"} if team else None,
    )
    fa.generate_team_diagram.cache_clear()
    img_team = fa.generate_team_diagram("offense", "SHOTGUN", team="KC")
    img_plain = fa.generate_team_diagram("offense", "SHOTGUN", team=None)
    assert img_team and img_plain
    assert img_team != img_plain

    img_cov = fa.generate_team_diagram("defense", "COVER_2", team="KC")
    img_cov_plain = fa.generate_team_diagram("defense", "COVER_2", team=None)
    assert img_cov != img_cov_plain
    fa.generate_team_diagram.cache_clear()


# ─── analyze_formations_from_pbp com tags reais ───

def test_epa_por_formacao_usa_tags_reais(pbp_ofensivo):
    result = analyze_formations_from_pbp(pbp_ofensivo, team="KC")
    # Antes: rótulos derivados ("Shotgun (Passe)"). Agora: labels das tags reais.
    assert set(result["chart"]["labels"]) == {"Shotgun", "Pistol"}
    assert result["total_plays"] == 40   # só jogadas com tag
    assert result["total_snaps"] == 45   # inclui as 5 sem tag


# ─── simulação de confronto (matchup) ───

def test_compose_matchup_template():
    t = compose_matchup_template("SHOTGUN", "COVER_3")
    assert len(t["offense"]) == 11
    assert len(t["defense"]) == 11


def test_compose_matchup_template_tag_invalida():
    assert compose_matchup_template("NOPE", "COVER_3") is None
    assert compose_matchup_template("SHOTGUN", "NOPE") is None


def test_generate_matchup_diagram(monkeypatch):
    from vision import formation_analyzer as fa
    monkeypatch.setattr(
        fa, "_team_colors",
        lambda team: {"primary": "#ff0000", "secondary": "#00ff00"} if team else None,
    )
    fa.generate_matchup_diagram.cache_clear()
    img = fa.generate_matchup_diagram("SHOTGUN", "COVER_3", "NE", "SEA")
    assert img and len(img) > 1000
    assert fa.generate_matchup_diagram("NOPE", "COVER_3", "NE", "SEA") is None
    assert fa.generate_matchup_diagram("SHOTGUN", "NOPE", "NE", "SEA") is None
    fa.generate_matchup_diagram.cache_clear()


def test_render_combinado_divide_o_campo(monkeypatch):
    """Com os dois lados coloridos, o campo ganha tintura por metade — o PNG muda."""
    from vision import formation_analyzer as fa
    template = fa.compose_matchup_template("SHOTGUN", "COVER_2")
    kwargs = dict(
        offense_colors={"primary": "#E31837", "secondary": "#FFB612"},
        defense_colors={"primary": "#69BE28", "secondary": "#002244"},
    )
    img_combined = fa._render_diagram(template, "t", **kwargs)
    img_plain = fa._render_diagram(template, "t")
    assert img_combined and img_plain and img_combined != img_plain


def test_render_combinado_com_cores_dos_dois_times():
    from vision import formation_analyzer as fa
    template = fa.compose_matchup_template("SHOTGUN", "COVER_2")
    img = fa._render_diagram(
        template, "Shotgun (NE) × Cover 2 (SEA)",
        offense_colors={"primary": "#002244", "secondary": "#C60C30"},
        defense_colors={"primary": "#002244", "secondary": "#69BE28"},
        offense_label="Ataque NE", defense_label="Front 7 SEA",
    )
    assert img and len(img) > 1000


# ─── conflito de cores no confronto ───

def test_colors_conflict():
    from vision.formation_analyzer import _colors_conflict
    assert _colors_conflict("#002244", "#002244") is True      # navy × navy (NE × SEA)
    assert _colors_conflict("#002244", "#0B2265") is True      # azuis escuros próximos
    assert _colors_conflict("#E31837", "#002244") is False     # vermelho × navy
    assert _colors_conflict("#222222", "#1a1a1a") is True      # quase-pretos
    assert _colors_conflict("#E31837", "#FFB612") is False     # vermelho × dourado


def test_resolve_defense_colors():
    from vision.formation_analyzer import _resolve_defense_colors
    off = {"primary": "#002244", "secondary": "#C60C30"}       # NE
    sea = {"primary": "#002244", "secondary": "#69BE28"}       # SEA: primária conflita
    resolved = _resolve_defense_colors(off, sea)
    assert resolved["primary"] == "#69BE28"                    # troca pra secundária
    assert resolved["secondary"] == "#002244"

    kc = {"primary": "#E31837", "secondary": "#FFB612"}        # sem conflito com navy
    assert _resolve_defense_colors(off, kc) == kc

    navy_navy = {"primary": "#002244", "secondary": "#0B2265"} # ambas conflitam
    resolved2 = _resolve_defense_colors(off, navy_navy)
    assert resolved2["primary"] == "#448aff"                   # fallback azul de dados

    assert _resolve_defense_colors(None, sea) == sea           # sem cores do ataque → intacto
