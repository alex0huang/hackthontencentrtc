#!/usr/bin/env bash
# Usage: GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com ./run.sh
set -e
cd "$(dirname "$0")"
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -q -r requirements.txt
exec uvicorn main:app --reload --port 8000
