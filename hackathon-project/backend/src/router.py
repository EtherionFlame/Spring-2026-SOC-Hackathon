import io
import uuid

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse

from src.predict import predict
from src.utils import session_store
from src.cleaner import clean_dataframe
from src.trainer import train_model, SUPPORTED_MODELS
from src.auth import (
    get_db, hash_password, verify_password,
    create_token, get_optional_user, get_current_user,
    db_create_session, db_log_operation,
)

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


# ─── Task 6: Auth endpoints ──────────────────────────────────────────────────

import re as _re

EMAIL_RE = _re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

@router.post("/auth/register", status_code=201)
def register(payload: dict):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=422, detail="Invalid email address.")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if len(password) > 50:
        raise HTTPException(status_code=422, detail="Password cannot exceed 50 characters.")
    if not _re.search(r'[A-Z]', password):
        raise HTTPException(status_code=422, detail="Password must contain at least one uppercase letter.")
    if not _re.search(r'[a-z]', password):
        raise HTTPException(status_code=422, detail="Password must contain at least one lowercase letter.")
    if not _re.search(r'[0-9]', password):
        raise HTTPException(status_code=422, detail="Password must contain at least one number.")
    if not _re.search(r'[!@#$%^&*()\-_=+\[\]{};:\'",.<>/?\\|`~]', password):
        raise HTTPException(status_code=422, detail="Password must contain at least one special character.")

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    hashed = hash_password(password)
    cursor = conn.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)", (email, hashed)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "email": email}}


@router.post("/auth/login")
def login(payload: dict):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    conn = get_db()
    row = conn.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (email,)
    ).fetchone()
    conn.close()

    if not row or not verify_password(password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_token(row["id"])
    return {"token": token, "user": {"id": row["id"], "email": email}}


# ─── Task 2: File Upload & CSV Preview ───────────────────────────────────────

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...), user_id: int = Depends(get_optional_user)):
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

    # Log session to DB (links to user if logged in, guest if not)
    try:
        db_create_session(session_id, file.filename, user_id)
    except Exception:
        pass  # Never block the upload over a DB write failure

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
async def clean_dataset(payload: dict, user_id: int = Depends(get_optional_user)):
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

    # Log to DB (silently skip if not in a DB session or write fails)
    try:
        db_log_operation(
            session_id=session_id,
            command=command,
            operation=result.get("operation"),
            column_name=result.get("column"),
            rows_affected=result.get("rows_affected"),
        )
    except Exception:
        pass

    return result


# ─── History: GET /api/history — past sessions for logged-in user ────────────

@router.get("/history")
def get_history(user_id: int = Depends(get_current_user)):
    """Return all sessions + cleaning logs for the authenticated user."""
    conn = get_db()

    sessions = conn.execute(
        """SELECT id, filename, uploaded_at
           FROM sessions
           WHERE user_id = ?
           ORDER BY uploaded_at DESC""",
        (user_id,)
    ).fetchall()

    result = []
    for s in sessions:
        logs = conn.execute(
            """SELECT command, operation, column_name, rows_affected, executed_at
               FROM cleaning_log
               WHERE session_id = ?
               ORDER BY executed_at ASC""",
            (s["id"],)
        ).fetchall()

        result.append({
            "session_id": s["id"],
            "filename": s["filename"],
            "uploaded_at": s["uploaded_at"],
            "active": s["id"] in session_store,
            "log": [dict(row) for row in logs],
        })

    conn.close()
    return result


# ─── ML Model Training: POST /api/train ──────────────────────────────────────

@router.post("/train")
def train_ml_model(payload: dict):
    """
    Train a machine learning model on the current session DataFrame.
    Accepts { session_id, model_type, target_col, feature_cols, test_size? }
    Returns metrics + base64 charts.
    """
    session_id  = payload.get("session_id")
    model_type  = payload.get("model_type", "").strip()
    target_col  = payload.get("target_col", "").strip()
    feature_cols = payload.get("feature_cols", [])
    test_size   = float(payload.get("test_size", 0.2))

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required.")
    if not model_type:
        raise HTTPException(status_code=400, detail="model_type is required.")
    if not target_col:
        raise HTTPException(status_code=400, detail="target_col is required.")
    if not feature_cols:
        raise HTTPException(status_code=400, detail="feature_cols must be a non-empty list.")
    if model_type not in SUPPORTED_MODELS:
        raise HTTPException(status_code=422, detail=f"model_type must be one of: {SUPPORTED_MODELS}")

    entry = session_store.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found.")

    df = entry["df"]

    try:
        result = train_model(df, model_type, target_col, feature_cols, test_size)
    except (ValueError, KeyError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")

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
