"""
Módulo 1 — Treinamento do Modelo
==================================
Treina um modelo XGBoost para prever a probabilidade de vitória
do time da casa com base em métricas avançadas (EPA, Success Rate).

Como usar:
    python -m ml.train

O modelo treinado é salvo em models/win_predictor.pkl
As métricas de avaliação são impressas no terminal.
"""
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from pathlib import Path

from data.loader import get_pbp_data, get_schedules
from ml.features import build_training_features, FEATURE_COLUMNS
from config import settings


def train():
    print("=" * 60)
    print("  NFL Win Predictor — Treinamento XGBoost")
    print("=" * 60)

    # ── 1. Carrega dados ──────────────────────────────────────
    print("\n[1/5] Carregando dados da NFL...")
    pbp = get_pbp_data(settings.nfl_seasons)
    schedules = get_schedules(settings.nfl_seasons)
    print(f"      {len(pbp):,} jogadas carregadas")
    print(f"      {len(schedules):,} jogos no calendário")

    # ── 2. Feature engineering ────────────────────────────────
    print("\n[2/5] Calculando features (EPA, Success Rate)...")
    games = build_training_features(pbp, schedules)
    games_clean = games[FEATURE_COLUMNS + ["home_win"]].dropna()
    print(f"      {len(games_clean)} jogos com features completas")

    X = games_clean[FEATURE_COLUMNS]
    y = games_clean["home_win"]
    print(f"      Distribuição: {y.value_counts().to_dict()}")

    # ── 3. Split treino/teste ─────────────────────────────────
    print("\n[3/5] Dividindo treino/teste (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── 4. Treina o modelo ────────────────────────────────────
    print("\n[4/5] Treinando XGBoost...")
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("xgb", XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="logloss",
            verbosity=0,
        ))
    ])

    model.fit(X_train, y_train)

    # ── 5. Avaliação ──────────────────────────────────────────
    print("\n[5/5] Avaliando o modelo...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)

    # Cross-validation para resultado mais robusto
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="roc_auc")

    print("\n" + "─" * 40)
    print(f"  Acurácia (test):  {accuracy:.1%}")
    print(f"  ROC-AUC (test):   {roc_auc:.4f}")
    print(f"  ROC-AUC (5-fold): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print("─" * 40)
    print("\nRelatório completo:")
    print(classification_report(y_test, y_pred, target_names=["Away Win", "Home Win"]))

    # Feature importance
    xgb_model = model.named_steps["xgb"]
    importances = dict(zip(FEATURE_COLUMNS, xgb_model.feature_importances_))
    top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
    print("Top 5 features mais importantes:")
    for feat, imp in top_features:
        print(f"  {feat}: {imp:.4f}")

    # ── Salva o modelo ────────────────────────────────────────
    model_path = settings.models_dir / "win_predictor.pkl"
    joblib.dump(model, model_path)
    print(f"\n✅ Modelo salvo em: {model_path}")

    # Salva também as métricas para o frontend
    metrics = {
        "accuracy": round(accuracy, 4),
        "roc_auc": round(roc_auc, 4),
        "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
        "cv_roc_auc_std": round(float(cv_scores.std()), 4),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "seasons": settings.nfl_seasons,
        "feature_importance": dict(top_features),
    }
    joblib.dump(metrics, settings.models_dir / "win_predictor_metrics.pkl")

    return model, metrics


if __name__ == "__main__":
    train()
