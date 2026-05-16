"""Sample module demonstrating secure patterns that pass AdaL Security Guard.

All inputs are validated, secrets come from the environment, SQL uses
parameterized queries, subprocess avoids shell=True, and file paths are
contained to an allowed base directory.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import sqlite3
import subprocess
from pathlib import Path

# --- Configuration loaded from environment (no hardcoded secrets) ---
DB_PATH = os.environ.get("APP_DB_PATH", "app.db")
UPLOAD_DIR = Path(os.environ.get("APP_UPLOAD_DIR", "/tmp/uploads")).resolve()


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} environment variable is required")
    return value


def verify_login(username: str, password: str) -> bool:
    """Verify a user's credentials using a parameterized query and constant-time compare."""
    pepper = _require_env("AUTH_PEPPER").encode("utf-8")
    candidate = hashlib.sha256(pepper + password.encode("utf-8")).hexdigest()

    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT password_hash FROM users WHERE username = ?",
            (username,),
        )
        row = cursor.fetchone()

    if row is None:
        return False
    return hmac.compare_digest(row[0], candidate)


def ping_host(hostname: str) -> bool:
    """Ping a host without invoking a shell."""
    if not hostname.replace(".", "").replace("-", "").isalnum():
        raise ValueError("invalid hostname")
    result = subprocess.run(
        ["ping", "-c", "1", hostname],
        shell=False,
        timeout=5,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def read_upload(filename: str) -> bytes:
    """Read a file from UPLOAD_DIR while preventing path traversal."""
    candidate = (UPLOAD_DIR / filename).resolve()
    if not candidate.is_relative_to(UPLOAD_DIR):
        raise PermissionError("path traversal detected")
    if not candidate.is_file():
        raise FileNotFoundError(filename)
    return candidate.read_bytes()


def list_users_by_role(role: str) -> list[tuple]:
    """Return all users with the given role, using a parameterized query."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT id, username FROM users WHERE role = ? ORDER BY username",
            (role,),
        )
        return cursor.fetchall()


def issue_session_token(user_id: int) -> str:
    """Issue a signed, time-bound session token using an env-loaded HMAC key."""
    import secrets
    import time

    signing_key = _require_env("SESSION_SIGNING_KEY").encode("utf-8")
    nonce = secrets.token_hex(16)
    expiry = int(time.time()) + 3600  # 1 hour
    payload = f"{user_id}.{expiry}.{nonce}".encode("utf-8")
    signature = hmac.new(signing_key, payload, hashlib.sha256).hexdigest()
    return f"{payload.decode()}.{signature}"
