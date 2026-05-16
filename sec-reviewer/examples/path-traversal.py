"""
VULNERABILITY: Path Traversal / Directory Traversal (CWE-22)

The `filename` parameter is joined onto a base directory without
validating that the resolved path stays inside the intended folder.
An attacker can request:  ../../../../etc/passwd
to read arbitrary files on the server (config, SSH keys, source code, …).

Severity: HIGH
"""

import os
from flask import Flask, request, send_file

app = Flask(__name__)
UPLOAD_DIR = "/var/app/uploads"


@app.route("/download")
def download():
    filename = request.args.get("file", "")

    # ❌ VULNERABLE: no normalization / containment check
    filepath = os.path.join(UPLOAD_DIR, filename)
    return send_file(filepath)


@app.route("/read")
def read_file():
    filename = request.args.get("name", "")

    # ❌ VULNERABLE: open() with attacker-controlled relative path
    with open(UPLOAD_DIR + "/" + filename, "r") as f:
        return f.read()


if __name__ == "__main__":
    # Attacker: GET /download?file=../../../../etc/passwd
    app.run()
