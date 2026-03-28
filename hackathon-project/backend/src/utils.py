"""
utils.py — Shared helpers and in-memory session store.
"""

# In-memory store: session_id (str) -> {"df": pd.DataFrame, "filename": str}
session_store: dict = {}


def preprocess(data):
    # TODO: add preprocessing steps
    return data


def postprocess(result):
    # TODO: add postprocessing steps
    return result
