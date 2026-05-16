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
