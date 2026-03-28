"""
stats.py — Descriptive statistics for a DataFrame column or the full dataset.
Returns structured dicts (no image) for the frontend to render as a table.
"""

import pandas as pd
import numpy as np

STATS_OPERATIONS = [
    "statistics",       # one column or whole dataset
]


def _col_stats(series: pd.Series) -> dict:
    """Compute stats for a single pandas Series."""
    s = series.dropna()
    is_numeric = pd.api.types.is_numeric_dtype(series)

    base = {
        "count":      int(series.count()),
        "null_count": int(series.isna().sum()),
        "unique":     int(series.nunique()),
        "dtype":      str(series.dtype),
    }

    if is_numeric:
        mode_vals = s.mode()
        base.update({
            "mean":     round(float(s.mean()), 4)     if len(s) else None,
            "median":   round(float(s.median()), 4)   if len(s) else None,
            "mode":     round(float(mode_vals.iloc[0]), 4) if len(mode_vals) else None,
            "std":      round(float(s.std()), 4)      if len(s) > 1 else None,
            "min":      round(float(s.min()), 4)      if len(s) else None,
            "max":      round(float(s.max()), 4)      if len(s) else None,
            "q1":       round(float(s.quantile(0.25)), 4) if len(s) else None,
            "q3":       round(float(s.quantile(0.75)), 4) if len(s) else None,
            "skewness": round(float(s.skew()), 4)     if len(s) > 2 else None,
        })
    else:
        top = s.value_counts()
        base.update({
            "top_value": str(top.index[0]) if len(top) else None,
            "top_freq":  int(top.iloc[0])  if len(top) else None,
        })

    return base


def compute_statistics(df: pd.DataFrame, column: str | None) -> dict:
    """
    If column is given → stats for that column.
    If column is None  → summary stats for every column.
    """
    if column:
        if column not in df.columns:
            raise KeyError(f"Column '{column}' not found. Available: {list(df.columns)}")
        stats = _col_stats(df[column])
        return {
            "type":      "statistics",
            "stats_type": "column",
            "message":   f"Statistics for '{column}'",
            "operation": "statistics",
            "column":    column,
            "stats":     stats,
        }

    # Whole-dataset summary
    summary = []
    for col in df.columns:
        row = {"column": col}
        row.update(_col_stats(df[col]))
        summary.append(row)

    return {
        "type":       "statistics",
        "stats_type": "dataset",
        "message":    f"Dataset summary — {len(df)} rows × {len(df.columns)} columns",
        "operation":  "statistics",
        "column":     None,
        "summary":    summary,
        "shape":      {"rows": len(df), "columns": len(df.columns)},
    }
