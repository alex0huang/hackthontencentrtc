"""
SAFE EQUIVALENTS

This file demonstrates the secure way to perform the same operations
shown in the vulnerable examples:
  - Parameterized SQL queries (prevents SQL injection)
  - Secrets loaded from environment / secret manager (no hardcoding)
  - argv-style subprocess calls (prevents command injection)
  - Path containment checks (prevents path traversal)

These patterns should be the default in every code review.
"""

import os
import sqlite3
import subprocess
from pathlib import Path


# ✅ SAFE: parameterized query — driver handles escaping
def login(username: str, password_hash: str) -> bool:
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT 1 FROM users WHERE username = ? AND password_hash = ?",
        (username, password_hash),
    )
    return cursor.fetchone() is not None


# ✅ SAFE: secrets read from environment, never committed
def get_db_password() -> str:
    pw = os.environ.get("DB_PASSWORD")
    if not pw:
        raise RuntimeError("DB_PASSWORD env var is required")
    return pw


# ✅ SAFE: argv list + shell=False — no shell metacharacter expansion
def ping_host(hostname: str) -> str:
    # Additionally validate the input shape
    if not hostname.replace(".", "").replace("-", "").isalnum():
        raise ValueError("invalid hostname")
    result = subprocess.check_output(
        ["ping", "-c", "1", hostname],
        shell=False,
        timeout=5,
    )
    return result.decode()


# ✅ SAFE: resolve and ensure path stays inside the allowed base directory
UPLOAD_DIR = Path("/var/app/uploads").resolve()


def safe_read(filename: str) -> bytes:
    candidate = (UPLOAD_DIR / filename).resolve()
    if not candidate.is_relative_to(UPLOAD_DIR):
        raise PermissionError("path traversal detected")
    return candidate.read_bytes()
