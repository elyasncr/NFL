"""
Módulo de carregamento de dados da NFL.
Usa nfl_data_py para baixar dados play-by-play, schedules e rosters.
Cache em memória para evitar downloads repetidos durante o desenvolvimento.
"""
import nfl_data_py as nfl
import pandas as pd
import pickle
from pathlib import Path
from functools import lru_cache
from config import settings

CACHE_DIR = settings.data_cache_dir


def _cache_path(name: str) -> Path:
    return CACHE_DIR / f"{name}.pkl"


def _load_or_fetch(name: str, fetch_fn) -> pd.DataFrame:
    """Carrega do disco se existir, senão baixa e salva."""
    path = _cache_path(name)
    if path.exists():
        print(f"[Cache] Carregando {name} do disco...")
        with open(path, "rb") as f:
            return pickle.load(f)
    
    print(f"[Download] Baixando {name} da NFL...")
    df = fetch_fn()
    with open(path, "wb") as f:
        pickle.dump(df, f)
    print(f"[Cache] {name} salvo com {len(df)} registros.")
    return df


def get_pbp_data(years: list[int] | None = None) -> pd.DataFrame:
    """
    Play-by-play: cada linha é uma jogada.
    Contém EPA, CPOE, down, distância, tipo de jogada, etc.
    """
    years = years or settings.nfl_seasons
    name = f"pbp_{'_'.join(map(str, years))}"
    return _load_or_fetch(name, lambda: nfl.import_pbp_data(years))


def get_schedules(years: list[int] | None = None) -> pd.DataFrame:
    """
    Calendário de jogos com resultados finais.
    Usado para treinar o modelo de predição de vitória.
    """
    years = years or settings.nfl_seasons
    name = f"schedules_{'_'.join(map(str, years))}"
    return _load_or_fetch(name, lambda: nfl.import_schedules(years))


def get_rosters(years: list[int] | None = None) -> pd.DataFrame:
    """
    Elenco de jogadores por temporada.
    Inclui posição, time, número de jersey.
    """
    years = years or [settings.current_season]
    name = f"rosters_{'_'.join(map(str, years))}"
    return _load_or_fetch(name, lambda: nfl.import_seasonal_rosters(years))


def get_player_stats(years: list[int] | None = None) -> pd.DataFrame:
    """
    Estatísticas agregadas por jogador/temporada.
    """
    years = years or settings.nfl_seasons
    name = f"player_stats_{'_'.join(map(str, years))}"
    return _load_or_fetch(name, lambda: nfl.import_weekly_data(years))


def clear_cache():
    """Remove todos os arquivos de cache (força novo download)."""
    for f in CACHE_DIR.glob("*.pkl"):
        f.unlink()
    print("[Cache] Cache limpo.")
