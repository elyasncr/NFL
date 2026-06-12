"""Testes do Módulo 4 — formation_analyzer. Sem rede: tudo com dados sintéticos."""
import pytest

from vision.formation_analyzer import parse_defense_personnel, classify_db_package


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
