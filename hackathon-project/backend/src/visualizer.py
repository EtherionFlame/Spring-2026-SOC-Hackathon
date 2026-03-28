"""
visualizer.py — Generate matplotlib/seaborn charts from a DataFrame.

All functions return a base64-encoded PNG string that the frontend
can drop straight into an <img src="data:image/png;base64,..."> tag.
No file I/O needed.
"""

import io
import base64

import matplotlib
matplotlib.use("Agg")          # Non-interactive — required for server use
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans

sns.set_theme(style="whitegrid", palette="muted")

VISUALIZATION_OPERATIONS = [
    "correlation_heatmap",
    "distribution_plot",
    "scatter_plot",
    "box_plot",
    "bar_chart",
    "cluster_diagram",
]

INDIGO = "#4f46e5"


# ── Internal helper ───────────────────────────────────────────────────────────

def _fig_to_base64(fig: plt.Figure) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=130)
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    return encoded


def _numeric_cols(df: pd.DataFrame) -> list[str]:
    return df.select_dtypes(include="number").columns.tolist()


# ── Chart generators ──────────────────────────────────────────────────────────

def correlation_heatmap(df: pd.DataFrame, column: str | None, params: dict) -> str:
    num_df = df[_numeric_cols(df)]
    if num_df.shape[1] < 2:
        raise ValueError("Need at least 2 numeric columns for a correlation heatmap.")
    corr = num_df.corr()
    fig, ax = plt.subplots(figsize=(max(6, corr.shape[1]), max(5, corr.shape[0] - 1)))
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm",
                linewidths=0.5, ax=ax, square=True)
    ax.set_title("Feature Correlation Heatmap", fontsize=13, fontweight="bold", pad=12)
    return _fig_to_base64(fig)


def distribution_plot(df: pd.DataFrame, column: str, params: dict) -> str:
    if column not in df.columns:
        raise KeyError(f"Column '{column}' not found.")
    fig, ax = plt.subplots(figsize=(8, 5))
    data = df[column].dropna()
    if pd.api.types.is_numeric_dtype(data):
        sns.histplot(data, bins=30, kde=True, ax=ax, color=INDIGO)
    else:
        data.value_counts().head(20).plot(kind="bar", ax=ax, color=INDIGO)
        plt.xticks(rotation=45, ha="right")
    ax.set_title(f"Distribution of {column}", fontsize=13, fontweight="bold")
    ax.set_xlabel(column)
    ax.set_ylabel("Count")
    return _fig_to_base64(fig)


def scatter_plot(df: pd.DataFrame, column: str, params: dict) -> str:
    col2 = params.get("column2", "")
    if not col2 or col2 not in df.columns:
        # Fall back to second numeric column automatically
        nums = _numeric_cols(df)
        others = [c for c in nums if c != column]
        if not others:
            raise ValueError("scatter_plot needs a second numeric column. Specify it with 'vs <column>'.")
        col2 = others[0]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(df[column], df[col2], alpha=0.45, color=INDIGO, edgecolors="white", linewidths=0.3)
    ax.set_xlabel(column, fontsize=11)
    ax.set_ylabel(col2, fontsize=11)
    ax.set_title(f"{column}  vs  {col2}", fontsize=13, fontweight="bold")
    return _fig_to_base64(fig)


def box_plot(df: pd.DataFrame, column: str, params: dict) -> str:
    if column not in df.columns:
        raise KeyError(f"Column '{column}' not found.")
    group_col = params.get("group_by", "")
    fig, ax = plt.subplots(figsize=(8, 6))
    if group_col and group_col in df.columns:
        groups = df.groupby(group_col)[column].apply(list)
        ax.boxplot(groups.values, labels=groups.index.tolist(), patch_artist=True)
        ax.set_xlabel(group_col)
        ax.set_title(f"{column} by {group_col}", fontsize=13, fontweight="bold")
    else:
        ax.boxplot(df[column].dropna(), patch_artist=True,
                   boxprops=dict(facecolor="#c7d2fe", color=INDIGO))
        ax.set_title(f"Box Plot — {column}", fontsize=13, fontweight="bold")
    ax.set_ylabel(column)
    return _fig_to_base64(fig)


def bar_chart(df: pd.DataFrame, column: str, params: dict) -> str:
    if column not in df.columns:
        raise KeyError(f"Column '{column}' not found.")
    fig, ax = plt.subplots(figsize=(9, 5))
    counts = df[column].value_counts().head(20)
    counts.plot(kind="bar", ax=ax, color=INDIGO, edgecolor="white")
    ax.set_title(f"Value Counts — {column}", fontsize=13, fontweight="bold")
    ax.set_xlabel(column)
    ax.set_ylabel("Count")
    plt.xticks(rotation=45, ha="right")
    return _fig_to_base64(fig)


def cluster_diagram(df: pd.DataFrame, column: str, params: dict) -> str:
    n_clusters = int(params.get("n_clusters", 3))
    nums = _numeric_cols(df)
    if len(nums) < 2:
        raise ValueError("Need at least 2 numeric columns for a cluster diagram.")

    col1 = column if column in nums else nums[0]
    col2 = params.get("column2", "")
    col2 = col2 if col2 in nums and col2 != col1 else next((c for c in nums if c != col1), nums[1])

    data = df[[col1, col2]].dropna()
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(data)

    fig, ax = plt.subplots(figsize=(8, 6))
    scatter = ax.scatter(data[col1], data[col2], c=labels,
                         cmap="viridis", alpha=0.6, edgecolors="white", linewidths=0.3)
    plt.colorbar(scatter, ax=ax, label="Cluster")
    ax.set_xlabel(col1, fontsize=11)
    ax.set_ylabel(col2, fontsize=11)
    ax.set_title(f"K-Means Clustering (k={n_clusters}): {col1} vs {col2}",
                 fontsize=13, fontweight="bold")
    return _fig_to_base64(fig)


# ── Dispatch ──────────────────────────────────────────────────────────────────

VIZ_DISPATCH = {
    "correlation_heatmap": correlation_heatmap,
    "distribution_plot":   distribution_plot,
    "scatter_plot":        scatter_plot,
    "box_plot":            box_plot,
    "bar_chart":           bar_chart,
    "cluster_diagram":     cluster_diagram,
}


def generate_visualization(df: pd.DataFrame, operation: str,
                            column: str | None, params: dict) -> dict:
    """
    Run the requested visualization and return a result dict with a base64 image.
    Does NOT modify the DataFrame.
    """
    fn = VIZ_DISPATCH.get(operation)
    if not fn:
        raise ValueError(f"Unknown visualization operation: '{operation}'")

    image_b64 = fn(df, column, params or {})

    return {
        "type": "visualization",
        "message": f"Generated {operation.replace('_', ' ')}"
                   + (f" for '{column}'" if column else ""),
        "operation": operation,
        "column": column,
        "image": image_b64,
    }
