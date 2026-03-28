"""
trainer.py — Train ML models on a cleaned DataFrame.

Models:
  random_forest      → RandomForestClassifier / RandomForestRegressor (auto)
  logistic_regression → LogisticRegression (classification only)
  linear_regression   → LinearRegression (regression only)

Task type is auto-detected from the target column.
All charts returned as base64 PNG strings.
"""

import io
import base64

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    r2_score, mean_squared_error, mean_absolute_error,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

sns.set_theme(style="whitegrid", palette="muted")

SUPPORTED_MODELS = ["random_forest", "logistic_regression", "linear_regression"]

MODEL_META = {
    "random_forest":       {"name": "Random Forest",        "task": "both"},
    "logistic_regression": {"name": "Logistic Regression",  "task": "classification"},
    "linear_regression":   {"name": "Linear Regression",    "task": "regression"},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fig_to_b64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=130)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return b64


def _is_classification(series: pd.Series) -> bool:
    """Return True if target looks categorical / discrete."""
    if series.dtype == object or str(series.dtype) == "category":
        return True
    n_unique = series.nunique()
    return n_unique <= 10 and n_unique / max(len(series), 1) < 0.05


def _encode_features(X: pd.DataFrame) -> pd.DataFrame:
    X = X.copy()
    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X[col] = le.fit_transform(X[col].astype(str))
    return X.fillna(X.median(numeric_only=True)).fillna(0)


# ── Chart generators ──────────────────────────────────────────────────────────

def _confusion_matrix_chart(y_test, y_pred, labels) -> str:
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues", ax=ax,
        xticklabels=labels, yticklabels=labels,
        linewidths=0.5,
    )
    ax.set_xlabel("Predicted", fontsize=11)
    ax.set_ylabel("Actual", fontsize=11)
    ax.set_title("Confusion Matrix", fontsize=13, fontweight="bold", pad=10)
    return _fig_to_b64(fig)


def _feature_importance_chart(importances, feature_names) -> str:
    pairs = sorted(zip(importances, feature_names), reverse=True)[:15]
    vals, names = zip(*pairs)
    fig, ax = plt.subplots(figsize=(8, max(4, len(names) * 0.4)))
    bars = ax.barh(range(len(names)), vals, color="#4f46e5", edgecolor="white")
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=9)
    ax.invert_yaxis()
    ax.set_xlabel("Importance")
    ax.set_title("Feature Importances (Top 15)", fontsize=13, fontweight="bold")
    for bar, v in zip(bars, vals):
        ax.text(bar.get_width() + 0.002, bar.get_y() + bar.get_height() / 2,
                f"{v:.3f}", va="center", fontsize=8, color="#374151")
    return _fig_to_b64(fig)


def _predicted_vs_actual_chart(y_test, y_pred) -> str:
    y_test = np.array(y_test)
    y_pred = np.array(y_pred)
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.scatter(y_test, y_pred, alpha=0.45, color="#4f46e5",
               edgecolors="white", linewidths=0.3, s=40)
    lo = min(y_test.min(), y_pred.min())
    hi = max(y_test.max(), y_pred.max())
    ax.plot([lo, hi], [lo, hi], "r--", linewidth=1.5, label="Perfect prediction")
    ax.set_xlabel("Actual", fontsize=11)
    ax.set_ylabel("Predicted", fontsize=11)
    ax.set_title("Predicted vs Actual", fontsize=13, fontweight="bold")
    ax.legend()
    return _fig_to_b64(fig)


def _residuals_chart(y_test, y_pred) -> str:
    residuals = np.array(y_test) - np.array(y_pred)
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.scatter(y_pred, residuals, alpha=0.45, color="#0891b2",
               edgecolors="white", linewidths=0.3, s=40)
    ax.axhline(0, color="red", linestyle="--", linewidth=1.5)
    ax.set_xlabel("Predicted", fontsize=11)
    ax.set_ylabel("Residual (Actual − Predicted)", fontsize=11)
    ax.set_title("Residuals Plot", fontsize=13, fontweight="bold")
    return _fig_to_b64(fig)


# ── Main training function ────────────────────────────────────────────────────

def train_model(
    df: pd.DataFrame,
    model_type: str,
    target_col: str,
    feature_cols: list[str],
    test_size: float = 0.2,
) -> dict:
    """Train a model and return metrics + base64 charts."""

    # ── Validate inputs ───────────────────────────────────────────────────────
    if model_type not in SUPPORTED_MODELS:
        raise ValueError(f"Unknown model '{model_type}'. Choose from: {SUPPORTED_MODELS}")
    if target_col not in df.columns:
        raise KeyError(f"Target column '{target_col}' not found.")
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise KeyError(f"Feature columns not found: {missing}")
    if not (0.05 <= test_size <= 0.5):
        raise ValueError("test_size must be between 0.05 and 0.50.")

    # ── Prepare data ──────────────────────────────────────────────────────────
    cols_needed = list(set(feature_cols + [target_col]))
    data = df[cols_needed].dropna(subset=[target_col])

    if len(data) < 20:
        raise ValueError(f"Only {len(data)} usable rows after dropping nulls. Need at least 20.")

    X_raw = data[feature_cols]
    y_raw = data[target_col]

    is_clf = _is_classification(y_raw)

    # Validate model/task compatibility
    if model_type == "logistic_regression" and not is_clf:
        raise ValueError(
            "Logistic Regression is for classification. "
            "Your target column looks continuous — use Linear Regression or Random Forest instead."
        )
    if model_type == "linear_regression" and is_clf:
        raise ValueError(
            "Linear Regression is for continuous targets. "
            "Your target column looks categorical — use Logistic Regression or Random Forest instead."
        )

    # Encode features + target
    X = _encode_features(X_raw)

    label_encoder = None
    labels = []
    if is_clf:
        if y_raw.dtype == object:
            label_encoder = LabelEncoder()
            y = pd.Series(label_encoder.fit_transform(y_raw.astype(str)), index=y_raw.index)
            labels = label_encoder.classes_.tolist()
        else:
            y = y_raw.copy()
            labels = [str(v) for v in sorted(y.unique())]
    else:
        y = y_raw.copy()

    # ── Train / test split ────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42,
        stratify=y if is_clf and y.nunique() > 1 else None,
    )

    # ── Build model ───────────────────────────────────────────────────────────
    if model_type == "random_forest":
        model = (
            RandomForestClassifier(n_estimators=150, random_state=42, n_jobs=-1)
            if is_clf else
            RandomForestRegressor(n_estimators=150, random_state=42, n_jobs=-1)
        )
    elif model_type == "logistic_regression":
        model = LogisticRegression(max_iter=1000, random_state=42)
    else:
        model = LinearRegression()

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # ── Metrics ───────────────────────────────────────────────────────────────
    metrics = {
        "train_samples": int(len(y_train)),
        "test_samples":  int(len(y_test)),
        "total_rows":    int(len(data)),
        "features_used": len(feature_cols),
    }
    charts = {}

    if is_clf:
        report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
        metrics.update({
            "accuracy":  round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(report["weighted avg"]["precision"]), 4),
            "recall":    round(float(report["weighted avg"]["recall"]), 4),
            "f1_score":  round(float(report["weighted avg"]["f1-score"]), 4),
        })
        charts["confusion_matrix"] = _confusion_matrix_chart(y_test, y_pred, labels)
    else:
        metrics.update({
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
            "rmse":     round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae":      round(float(mean_absolute_error(y_test, y_pred)), 4),
            "mse":      round(float(mean_squared_error(y_test, y_pred)), 4),
        })
        charts["predicted_vs_actual"] = _predicted_vs_actual_chart(y_test, y_pred)
        charts["residuals"] = _residuals_chart(y_test, y_pred)

    # Feature importance (tree models only)
    if hasattr(model, "feature_importances_"):
        charts["feature_importance"] = _feature_importance_chart(
            model.feature_importances_, feature_cols
        )

    return {
        "type":       "model",
        "model_type": model_type,
        "model_name": MODEL_META[model_type]["name"],
        "task":       "classification" if is_clf else "regression",
        "target":     target_col,
        "features":   feature_cols,
        "test_size":  test_size,
        "metrics":    metrics,
        "charts":     charts,
        "message":    (
            f"Trained {MODEL_META[model_type]['name']} — "
            f"{'accuracy' if is_clf else 'R²'}: "
            f"{metrics.get('accuracy') or metrics.get('r2_score')}"
        ),
    }
