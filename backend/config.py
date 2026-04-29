from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    # API
    app_name: str = "NFL Analytics API"
    debug: bool = True

    # Data
    nfl_seasons: list[int] = [2022, 2023, 2024]
    current_season: int = 2024

    # Paths
    models_dir: Path = Path("models")
    data_cache_dir: Path = Path("data_cache")

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # RAG
    chroma_db_dir: str = "chroma_db"

    class Config:
        env_file = ".env"

settings = Settings()

# Garante que os diretórios existem
settings.models_dir.mkdir(exist_ok=True)
settings.data_cache_dir.mkdir(exist_ok=True)
