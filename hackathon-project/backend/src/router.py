import io
import uuid

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse

from src.predict import predict
from src.utils import session_store
from src.cleaner import clean_dataframe

router = APIRouter()


# ─── Health ──────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "healthy"}


# ─── Legacy predict (scaffold) ────────────────────────────────────────────────

@router.post("/predict")
def run_prediction(payload: dict):
    result = predict(payload)
    return {"result": result}


# ─── Task 2: File Upload & CSV Preview ───────────────────────────────────────

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Accept a CSV file, parse it, store the DataFrame in session_store,
    and return a session_id plus a preview of the first 10 rows.
    """
    # Validate file extension
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=422, detail="CSV parsed but contains no data rows.")

    session_id = str(uuid.uuid4())
    session_store[session_id] = {
        "df": df,
        "filename": file.filename,
    }

    preview = df.head(10).fillna("").to_dict(orient="records")
    columns = list(df.columns)

    return {
        "session_id": session_id,
        "filename": file.filename,
        "total_rows": len(df),
        "total_columns": len(columns),
        "columns": columns,
        "preview": preview,
    }


@router.get("/session/{session_id}")
def get_session(session_id: str):
    """Return metadata and current preview for an existing session."""
    entry = session_store.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found.")

    df: pd.DataFrame = entry["df"]
    preview = df.head(10).fillna("").to_dict(orient="records")

    return {
        "session_id": session_id,
        "filename": entry["filename"],
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "preview": preview,
    }


# ─── Task 4: POST /api/clean — NL → Mistral → pandas ────────────────────────

@router.post("/clean")
async def clean_dataset(payload: dict):
    """
    Accepts { session_id, command }, runs the NL → Mistral → pandas pipeline,
    updates the session DataFrame, and returns a before/after result.
    """
    session_id = payload.get("session_id")
    command = payload.get("command", "").strip()

    if not session_id or not command:
        raise HTTPException(status_code=400, detail="session_id and command are required.")

    entry = session_store.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found.")

    df: pd.DataFrame = entry["df"]
    columns = list(df.columns)

    try:
        new_df, result = clean_dataframe(df, command, columns)
    except ConnectionError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except KeyError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except TypeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    # Persist the cleaned DataFrame back into the session
    session_store[session_id]["df"] = new_df

    return result


# ─── Task 4+: GET /api/download/{session_id} — download cleaned CSV ──────────

@router.get("/download/{session_id}")
def download_csv(session_id: str):
    """Stream the current (cleaned) DataFrame back as a CSV file download."""
    entry = session_store.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found.")

    df: pd.DataFrame = entry["df"]
    filename = entry["filename"].replace(".csv", "_cleaned.csv")

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)

    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
