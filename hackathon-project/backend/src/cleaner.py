"""
cleaner.py — NL → operation classifier + safe pandas execution engine.

Flow:
  1. Build a prompt with the user's command + available columns.
  2. Ask Mistral (via Ollama) to return structured JSON.
  3. Map the operation string to a whitelisted pandas function.
  4. Execute and return a result dict with before/after previews.
"""

import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from src.ollama_client import ask_ollama, extract_json

# ── Operation whitelist ────────────────────────────────────────────────────────

SUPPORTED_OPERATIONS = [
    "drop_nulls",
    "fill_median",
    "fill_mean",
    "remove_outliers",
    "normalize",
    "encode_onehot",
    "drop_duplicates",
    "drop_column",
    "rename_column",
]


# ── Prompt builder ─────────────────────────────────────────────────────────────

def _build_prompt(command: str, columns: list[str]) -> str:
    ops_list = "\n".join(f"  - {op}" for op in SUPPORTED_OPERATIONS)
    cols_str = ", ".join(columns)
    return f"""You are a data-cleaning assistant. Given a natural language command and a list of column names, return ONLY a JSON object with no explanation.

Available columns: {cols_str}

Supported operations:
{ops_list}

Rules:
- "operation" must be exactly one of the supported operations above.
- "column" must be one of the available columns (or null for drop_duplicates).
- "params" should include "new_name" only for rename_column.
- Return ONLY valid JSON. No markdown, no explanation.

Command: "{command}"

JSON:"""


# ── Pandas execution engine ────────────────────────────────────────────────────

def _execute(df: pd.DataFrame, operation: str, column: str | None, params: dict) -> tuple[pd.DataFrame, int]:
    """
    Apply the whitelisted operation to df.
    Returns (new_df, rows_affected).
    Never uses eval() or exec().
    """
    before_len = len(df)

    if operation == "drop_nulls":
        if column:
            new_df = df.dropna(subset=[column])
        else:
            new_df = df.dropna()

    elif operation == "fill_median":
        _require_numeric(df, column)
        new_df = df.copy()
        new_df[column] = new_df[column].fillna(new_df[column].median())

    elif operation == "fill_mean":
        _require_numeric(df, column)
        new_df = df.copy()
        new_df[column] = new_df[column].fillna(new_df[column].mean())

    elif operation == "remove_outliers":
        _require_numeric(df, column)
        q1 = df[column].quantile(0.25)
        q3 = df[column].quantile(0.75)
        iqr = q3 - q1
        new_df = df[(df[column] >= q1 - 1.5 * iqr) & (df[column] <= q3 + 1.5 * iqr)]

    elif operation == "normalize":
        _require_numeric(df, column)
        new_df = df.copy()
        scaler = MinMaxScaler()
        new_df[[column]] = scaler.fit_transform(new_df[[column]])

    elif operation == "encode_onehot":
        new_df = pd.get_dummies(df, columns=[column], prefix=column)

    elif operation == "drop_duplicates":
        new_df = df.drop_duplicates()

    elif operation == "drop_column":
        if column not in df.columns:
            raise KeyError(f"Column '{column}' not found.")
        new_df = df.drop(columns=[column])

    elif operation == "rename_column":
        new_name = params.get("new_name", "").strip()
        if not new_name:
            raise ValueError("rename_column requires 'new_name' in params.")
        if column not in df.columns:
            raise KeyError(f"Column '{column}' not found.")
        new_df = df.rename(columns={column: new_name})

    else:
        raise ValueError(f"Unknown operation: '{operation}'")

    rows_affected = abs(len(new_df) - before_len) if len(new_df) != before_len else len(new_df)
    return new_df, rows_affected


def _require_numeric(df: pd.DataFrame, column: str):
    if column not in df.columns:
        raise KeyError(f"Column '{column}' not found.")
    if not pd.api.types.is_numeric_dtype(df[column]):
        raise TypeError(f"Column '{column}' is not numeric.")


# ── Public API ─────────────────────────────────────────────────────────────────

def clean_dataframe(df: pd.DataFrame, command: str, columns: list[str]) -> tuple[pd.DataFrame, dict]:
    """
    Parse a natural-language command via Mistral, execute it safely on df.

    Returns:
        (new_df, result_dict)

    result_dict keys:
        message, operation, column, rows_affected, before_preview, after_preview
    """
    # 1. Ask Mistral
    prompt = _build_prompt(command, columns)
    raw = ask_ollama(prompt)

    # 2. Parse JSON
    try:
        parsed = extract_json(raw)
    except (ValueError, Exception) as e:
        raise ValueError(f"Could not parse Mistral response as JSON. Raw: {raw!r}") from e

    operation = parsed.get("operation", "").strip()
    column = parsed.get("column") or None
    params = parsed.get("params") or {}

    # 3. Validate operation against whitelist
    if operation not in SUPPORTED_OPERATIONS:
        raise ValueError(
            f"Unrecognized operation '{operation}'. "
            f"Supported: {', '.join(SUPPORTED_OPERATIONS)}"
        )

    # 4. Validate column exists (when required)
    if column and column not in df.columns:
        raise KeyError(f"Column '{column}' not found in dataset. Available: {list(df.columns)}")

    # 5. Capture before preview
    before_preview = df.head(5).fillna("").to_dict(orient="records")

    # 6. Execute
    new_df, rows_affected = _execute(df, operation, column, params)

    # 7. Capture after preview
    after_preview = new_df.head(5).fillna("").to_dict(orient="records")

    result = {
        "message": f"Successfully applied '{operation}'" + (f" on '{column}'" if column else ""),
        "operation": operation,
        "column": column,
        "rows_affected": rows_affected,
        "before_preview": before_preview,
        "after_preview": after_preview,
    }

    return new_df, result
