"""
Módulo 4 — Visão Computacional
================================
Análise de formações táticas da NFL com OpenCV e matplotlib.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from urllib.parse import unquote
from vision.formation_analyzer import (
    analyze_formations_from_pbp,
    analyze_team_formations,
    generate_formation_diagram,
    generate_team_diagram,
    analyze_uploaded_image,
    FORMATION_TEMPLATES,
    OFFENSE_FORMATION_TEMPLATES,
    COVERAGE_TEMPLATES,
)
from data.loader import get_pbp_data
from config import settings

router = APIRouter(prefix="/vision", tags=["Computer Vision"])


@router.get("/status")
def vision_status():
    return {
        "module": "Computer Vision (Módulo 4)",
        "status": "ativo",
        "features": [
            "Análise de frequência e EPA por formação (dados PBP)",
            "Geração de diagramas de campo (matplotlib)",
            "Detecção de jogadores em imagens (OpenCV HoughCircles)",
        ],
        "formations_available": list(FORMATION_TEMPLATES.keys()),
    }


@router.get("/formations/data")
def formations_data(team: str = None, season: int = None):
    year = season or settings.current_season
    pbp = get_pbp_data([year])
    result = analyze_formations_from_pbp(pbp, team=team)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/team-formations")
def team_formations(team: str = None, season: int = None):
    """Formações ofensivas reais + coberturas/personnel defensivos por time."""
    year = season or settings.current_season
    pbp = get_pbp_data([year])
    result = analyze_team_formations(pbp, team=team)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    result["season"] = year
    return result


@router.get("/team-formations/diagram/{side}/{tag}")
def team_formation_diagram(side: str, tag: str, team: str = None, theme: str = "dark"):
    """Diagrama de formação (offense) ou cobertura (defense), nas cores do time."""
    if side not in ("offense", "defense"):
        raise HTTPException(status_code=400, detail="side deve ser 'offense' ou 'defense'.")
    tag = unquote(tag).upper()
    templates = OFFENSE_FORMATION_TEMPLATES if side == "offense" else COVERAGE_TEMPLATES
    template = templates.get(tag)
    if not template:
        raise HTTPException(status_code=404, detail=f"Disponíveis ({side}): {list(templates.keys())}")
    img_b64 = generate_team_diagram(side, tag, team=team.upper() if team else None, theme=theme)
    return {
        "tag": tag,
        "side": side,
        "formation": template["label"],
        "description": template["description"],
        "image_base64": img_b64,
        "mime_type": "image/png",
    }


@router.get("/formations/diagram/{formation_name}")
def formation_diagram(formation_name: str, theme: str = "dark"):
    name = unquote(formation_name)
    img_b64 = generate_formation_diagram(name, theme=theme)
    if not img_b64:
        raise HTTPException(status_code=404, detail=f"Disponíveis: {list(FORMATION_TEMPLATES.keys())}")
    return {
        "formation": name,
        "description": FORMATION_TEMPLATES[name]["description"],
        "image_base64": img_b64,
        "mime_type": "image/png",
    }


@router.get("/formations/list")
def list_formations():
    return {"formations": [{"name": n, "description": t["description"]} for n, t in FORMATION_TEMPLATES.items()]}


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Use PNG ou JPEG.")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem > 5MB.")
    return analyze_uploaded_image(contents)
