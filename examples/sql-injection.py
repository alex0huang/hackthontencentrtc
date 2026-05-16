"""
VULNERABILITY: SQL Injection (CWE-89)

The user-supplied `username` is concatenated directly into the SQL query string.
An attacker can supply input like:  admin' OR '1'='1
which turns the WHERE clause into a tautology and bypasses authentication,
or:  '; DROP TABLE users;--
which can destroy data.

Severity: CRITICAL
"""

import sqlite3


def login(username: str, password: str) -> bool:
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()

    # ❌ VULNERABLE: string concatenation in SQL
    query = "SELECT * FROM users WHERE username = '" + username + \
            "' AND password = '" + password + "'"
    cursor.execute(query)

    return cursor.fetchone() is not None


if __name__ == "__main__":
    # Attacker bypasses auth: username="admin' --", password="anything"
    print(login("admin' --", "irrelevant"))
