"""
auth.py — JWT authentication + SQLite user/session/log schema.

Tables:
  users        — email + bcrypt password hash
  sessions     — CSV upload sessions linked to a user (optional)
  cleaning_log — every NL command logged per session

Password hashing: bcrypt via passlib
Token signing:    HS256 JWT via python-jose
"""

import os
import sqlite3
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# ── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET", "nl-cleaner-hackathon-secret-change-in-prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 8

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "app.db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)   # auto_error=False → guest allowed


# ── Database init ─────────────────────────────────────────────────────────────

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't already exist. Called once on startup."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT    UNIQUE NOT NULL,
            password_hash TEXT    NOT NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id          TEXT    PRIMARY KEY,
            user_id     INTEGER REFERENCES users(id),
            filename    TEXT    NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cleaning_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id   TEXT    REFERENCES sessions(id),
            command      TEXT    NOT NULL,
            operation    TEXT,
            column_name  TEXT,
            rows_affected INTEGER,
            executed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> int:
    """Strictly require a valid JWT. Returns user_id or raises 401."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required.")
    user_id = decode_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user_id


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> Optional[int]:
    """
    Try to decode JWT but never fail.
    Returns user_id if valid token present, None for guests.
    Used on /upload and /clean so unauthenticated users can still use the app.
    """
    if not credentials:
        return None
    return decode_token(credentials.credentials)


# ── DB helpers used by router ─────────────────────────────────────────────────

def db_create_session(session_id: str, filename: str, user_id: Optional[int]) -> None:
    """Insert a row into sessions table. user_id may be None for guests."""
    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (id, user_id, filename) VALUES (?, ?, ?)",
        (session_id, user_id, filename),
    )
    conn.commit()
    conn.close()


def db_log_operation(
    session_id: str,
    command: str,
    operation: Optional[str],
    column_name: Optional[str],
    rows_affected: Optional[int],
) -> None:
    """Append a row to cleaning_log."""
    conn = get_db()
    conn.execute(
        """INSERT INTO cleaning_log
           (session_id, command, operation, column_name, rows_affected)
           VALUES (?, ?, ?, ?, ?)""",
        (session_id, command, operation, column_name, rows_affected),
    )
    conn.commit()
    conn.close()
