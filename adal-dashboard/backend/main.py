"""AdaL Dashboard backend — GitHub OAuth + SecReviewer findings aggregator.

Endpoints:
  GET  /auth/github/start     -> redirect to GitHub OAuth
  GET  /auth/github/callback  -> exchange code, create session, redirect to frontend
  GET  /me                    -> current user info
  GET  /repos                 -> user's GitHub repos + whether sec-reviewer is installed
  GET  /findings              -> SecReviewer findings parsed from user's PR comments

Env vars:
  GITHUB_CLIENT_ID      OAuth App client id
  GITHUB_CLIENT_SECRET  OAuth App client secret
  FRONTEND_URL          default http://localhost:5173
  BACKEND_URL           default http://localhost:8000
"""
from __future__ import annotations

import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# -------- config --------
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
DB_PATH = Path(os.environ.get("ADAL_DASH_DB", Path.home() / ".adal" / "dashboard.db"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

PR_COMMENT_MARKER = "SecReviewer Report"
COMMIT_COMMENT_MARKER = "adal-guard:commit-review"
WORKFLOW_PATH = ".github/workflows/sec-review.yml"
PREPUSH_HOOK_PATH = ".git/hooks/pre-push"  # informational only
SEC_REVIEW_LOG = Path.home() / ".adal" / "sec-review.log"


# -------- db --------
@contextmanager
def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db():
    with db() as c:
        # drop legacy tables from the old Google-auth schema if present
        c.execute("DROP TABLE IF EXISTS repos")
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                github_id INTEGER UNIQUE NOT NULL,
                login TEXT NOT NULL,
                name TEXT,
                email TEXT,
                avatar TEXT,
                access_token TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS oauth_state (
                state TEXT PRIMARY KEY,
                created_at INTEGER NOT NULL
            );
            """
        )


init_db()


# -------- app --------
app = FastAPI(title="AdaL Dashboard")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_user(authorization: Optional[str] = Header(None)) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization[7:]
    with db() as c:
        row = c.execute(
            "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?",
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(401, "invalid session")
        return row


# -------- GitHub OAuth --------
@app.get("/auth/github/start")
def auth_github_start():
    if not GITHUB_CLIENT_ID:
        raise HTTPException(500, "GITHUB_CLIENT_ID not configured on backend")
    state = secrets.token_urlsafe(16)
    with db() as c:
        c.execute(
            "INSERT INTO oauth_state(state, created_at) VALUES (?, ?)",
            (state, int(time.time())),
        )
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{BACKEND_URL}/auth/github/callback",
        "scope": "read:user user:email repo",
        "state": state,
    }
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    )


@app.get("/auth/github/callback")
async def auth_github_callback(code: str, state: str):
    if not GITHUB_CLIENT_SECRET:
        raise HTTPException(500, "GITHUB_CLIENT_SECRET not configured on backend")
    with db() as c:
        row = c.execute(
            "SELECT state FROM oauth_state WHERE state = ?", (state,)
        ).fetchone()
        if not row:
            raise HTTPException(400, "invalid or expired state")
        c.execute("DELETE FROM oauth_state WHERE state = ?", (state,))

    async with httpx.AsyncClient(timeout=15) as client:
        tr = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": f"{BACKEND_URL}/auth/github/callback",
            },
            headers={"Accept": "application/json"},
        )
        if tr.status_code != 200:
            raise HTTPException(401, f"github token exchange failed: {tr.text}")
        access_token = tr.json().get("access_token")
        if not access_token:
            raise HTTPException(401, "github did not return an access token")

        gh_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }
        ur = await client.get("https://api.github.com/user", headers=gh_headers)
        if ur.status_code != 200:
            raise HTTPException(401, "github user fetch failed")
        u = ur.json()

        primary_email = u.get("email")
        er = await client.get(
            "https://api.github.com/user/emails", headers=gh_headers
        )
        if er.status_code == 200:
            for e in er.json():
                if e.get("primary"):
                    primary_email = e.get("email") or primary_email
                    break

    with db() as c:
        c.execute(
            """INSERT INTO users(github_id, login, name, email, avatar, access_token)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(github_id) DO UPDATE SET
                 login=excluded.login,
                 name=excluded.name,
                 email=excluded.email,
                 avatar=excluded.avatar,
                 access_token=excluded.access_token""",
            (
                u["id"],
                u["login"],
                u.get("name"),
                primary_email,
                u.get("avatar_url"),
                access_token,
            ),
        )
        user_id = c.execute(
            "SELECT id FROM users WHERE github_id = ?", (u["id"],)
        ).fetchone()["id"]
        sess_token = secrets.token_urlsafe(32)
        c.execute(
            "INSERT INTO sessions(token, user_id, created_at) VALUES (?, ?, ?)",
            (sess_token, user_id, int(time.time())),
        )

    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={sess_token}")


@app.post("/logout")
def logout(user=Depends(current_user), authorization: str = Header(None)):
    token = authorization[7:]
    with db() as c:
        c.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return {"ok": True}


@app.get("/me")
def me(user=Depends(current_user)):
    return {
        "login": user["login"],
        "name": user["name"],
        "email": user["email"],
        "avatar": user["avatar"],
    }


# -------- repos --------
@app.get("/repos")
async def list_repos(user=Depends(current_user)):
    """List user's GitHub repos and indicate whether sec-reviewer is installed."""
    headers = {
        "Authorization": f"Bearer {user['access_token']}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(headers=headers, timeout=20) as client:
        rr = await client.get(
            "https://api.github.com/user/repos?per_page=50&sort=pushed"
        )
        if rr.status_code != 200:
            raise HTTPException(500, f"github error: {rr.text}")
        repos = rr.json()
        out = []
        for r in repos:
            owner = r["owner"]["login"]
            name = r["name"]
            installed = False
            fr = await client.get(
                f"https://api.github.com/repos/{owner}/{name}/contents/{WORKFLOW_PATH}"
            )
            if fr.status_code == 200:
                installed = True
            out.append(
                {
                    "full_name": r["full_name"],
                    "owner": owner,
                    "name": name,
                    "url": r["html_url"],
                    "private": r["private"],
                    "default_branch": r.get("default_branch", "main"),
                    "pushed_at": r.get("pushed_at"),
                    "sec_reviewer_installed": installed,
                }
            )
    return out


# -------- findings --------
_BOLD_LOC = re.compile(r"\*\*([^*]+?)\*\*")
_FILE_LINE = re.compile(r"([^\s`]+?):(\d+)")
_VERDICT_RE = re.compile(r"VERDICT:\s*(PASS|BLOCK)", re.IGNORECASE)


def _classify_section(header: str) -> Optional[str]:
    """Map a markdown header to one of critical/warnings/suggestions."""
    h = header.lower()
    if any(k in h for k in ("critical", "new vulnerabilit", "vulnerabilit")):
        return "critical"
    if any(k in h for k in ("risky deletion", "warning", "deletion")):
        return "warnings"
    if any(k in h for k in ("suggestion", "note")):
        return "suggestions"
    if "human review" in h:
        return "_human"
    return None


def parse_secreviewer_comment(body: str) -> dict:
    """Parse either format: legacy PR `🛡️ SecReviewer Report` or new pre-push `AdaL Security Review`.

    Returns {critical, warnings, suggestions, human_review_needed, verdict}.
    """
    sections: dict[str, list] = {"critical": [], "warnings": [], "suggestions": []}
    current: Optional[str] = None
    human_review: Optional[bool] = None

    v = _VERDICT_RE.search(body)
    verdict = v.group(1).upper() if v else None

    for raw in body.splitlines():
        line = raw.strip()
        if line.startswith("#"):
            current = _classify_section(line)
            continue
        if current == "_human":
            lower = line.lower()
            if "yes" in lower:
                human_review = True
            elif "no" in lower:
                human_review = False
            continue
        if current and (line.startswith("- ") or line.startswith("* ")):
            item = line[2:].strip()
            file = None
            line_no = None
            bold = _BOLD_LOC.search(item)
            if bold:
                loc = bold.group(1).strip()
                fl = _FILE_LINE.search(loc)
                if fl:
                    file, line_no = fl.group(1), fl.group(2)
                else:
                    file = loc or None
                message = item[bold.end():].lstrip(" —–-:•").strip()
            else:
                fl = _FILE_LINE.search(item)
                if fl:
                    file, line_no = fl.group(1), fl.group(2)
                message = item
            sections[current].append(
                {"file": file, "line": line_no, "message": message or item}
            )

    return {
        "critical": sections["critical"],
        "warnings": sections["warnings"],
        "suggestions": sections["suggestions"],
        "human_review_needed": human_review,
        "verdict": verdict,
    }


def _severity_for(parsed: dict) -> str:
    if parsed.get("verdict") == "BLOCK":
        return "critical"
    if parsed["critical"]:
        return "critical"
    if parsed["warnings"]:
        return "warning"
    if parsed["suggestions"]:
        return "suggestion"
    return "clean"


async def _collect_pr_findings(client: httpx.AsyncClient, login: str) -> list[dict]:
    """Legacy: SecReviewer GitHub Action comments on PRs the user authored."""
    out: list[dict] = []
    q = f"is:pr author:{login} sort:created-desc"
    sr = await client.get(f"https://api.github.com/search/issues?q={q}&per_page=30")
    if sr.status_code != 200:
        return out
    for pr in sr.json().get("items", []):
        cr = await client.get(pr.get("comments_url", ""))
        if cr.status_code != 200:
            continue
        for c in cr.json():
            body = c.get("body") or ""
            if PR_COMMENT_MARKER not in body:
                continue
            parsed = parse_secreviewer_comment(body)
            repo_url = pr.get("repository_url", "")
            repo_full = "/".join(repo_url.split("/")[-2:]) if repo_url else ""
            out.append(
                {
                    "kind": "pr",
                    "repo": repo_full,
                    "ref_number": pr.get("number"),
                    "ref_title": pr.get("title"),
                    "ref_url": pr.get("html_url"),
                    "comment_url": c.get("html_url"),
                    "created_at": c.get("created_at"),
                    "author": (c.get("user") or {}).get("login"),
                    "severity": _severity_for(parsed),
                    "raw": body,
                    **parsed,
                }
            )
    return out


async def _collect_commit_findings(
    client: httpx.AsyncClient, login: str
) -> list[dict]:
    """New: AdaL pre-push hook posts review as a commit comment on each pushed commit."""
    out: list[dict] = []
    rr = await client.get(
        "https://api.github.com/user/repos?per_page=30&sort=pushed&affiliation=owner,collaborator"
    )
    if rr.status_code != 200:
        return out
    for repo in rr.json():
        owner = repo["owner"]["login"]
        name = repo["name"]
        cr = await client.get(
            f"https://api.github.com/repos/{owner}/{name}/comments?per_page=50"
        )
        if cr.status_code != 200:
            continue
        for c in cr.json():
            body = c.get("body") or ""
            if COMMIT_COMMENT_MARKER not in body and "AdaL Security Review" not in body:
                continue
            parsed = parse_secreviewer_comment(body)
            sha = c.get("commit_id", "")
            out.append(
                {
                    "kind": "commit",
                    "repo": f"{owner}/{name}",
                    "ref_number": sha[:7],
                    "ref_title": f"commit {sha[:7]}",
                    "ref_url": c.get("html_url")
                    or f"https://github.com/{owner}/{name}/commit/{sha}",
                    "comment_url": c.get("html_url"),
                    "created_at": c.get("created_at"),
                    "author": (c.get("user") or {}).get("login"),
                    "severity": _severity_for(parsed),
                    "raw": body,
                    **parsed,
                }
            )
    return out


_RUN_HEADER_RE = re.compile(
    r"\[adal-guard\][^\n]*Running AdaL security review before pushing to (\S+)\s*\(([^)]+)\)"
)


def _collect_blocked_pushes() -> list[dict]:
    """Parse ~/.adal/sec-review.log into one record per pre-push review attempt.

    The hook appends sections like:
      [adal-guard] 🛡️  Running AdaL security review before pushing to origin (URL)...
      [adal-guard] Calling adal (may take 30-90s)...
      VERDICT: BLOCK
      ... markdown findings ...
      [adal-guard] ❌ Critical security issues found. Push BLOCKED.
    """
    if not SEC_REVIEW_LOG.exists():
        return []
    text = SEC_REVIEW_LOG.read_text(errors="ignore")
    mtime_iso = (
        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(SEC_REVIEW_LOG.stat().st_mtime))
    )

    blocks: list[dict] = []
    current: Optional[dict] = None
    for line in text.splitlines():
        m = _RUN_HEADER_RE.search(line)
        if m:
            if current is not None:
                blocks.append(current)
            url = m.group(2)
            slug_match = re.search(r"github\.com[:/]([^/]+)/([^/.]+)", url)
            repo = (
                f"{slug_match.group(1)}/{slug_match.group(2)}" if slug_match else url
            )
            current = {
                "remote": m.group(1),
                "url": url,
                "repo": repo,
                "lines": [],
            }
        elif current is not None:
            current["lines"].append(line)
    if current is not None:
        blocks.append(current)

    out: list[dict] = []
    for i, b in enumerate(blocks):
        body = "\n".join(b["lines"])
        parsed = parse_secreviewer_comment(body)
        if not parsed["verdict"] and not (
            parsed["critical"] or parsed["warnings"] or parsed["suggestions"]
        ):
            continue
        out.append(
            {
                "kind": "block",
                "repo": b["repo"],
                "ref_number": f"local#{len(blocks) - i}",
                "ref_title": f"Blocked push to {b['remote']}",
                "ref_url": b["url"],
                "comment_url": None,
                "created_at": mtime_iso,
                "author": "pre-push hook",
                "severity": _severity_for(parsed),
                "raw": body,
                **parsed,
            }
        )
    return out


@app.get("/findings")
async def findings(user=Depends(current_user)):
    """Aggregate SecReviewer findings from PR comments, commit comments, and local blocked pushes."""
    headers = {
        "Authorization": f"Bearer {user['access_token']}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(headers=headers, timeout=30) as client:
        pr_items = await _collect_pr_findings(client, user["login"])
        commit_items = await _collect_commit_findings(client, user["login"])
    block_items = _collect_blocked_pushes()
    out = pr_items + commit_items + block_items
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return {
        "count": len(out),
        "blocked_count": sum(1 for f in out if f.get("kind") == "block"),
        "total_critical": sum(len(f["critical"]) for f in out),
        "total_warnings": sum(len(f["warnings"]) for f in out),
        "total_suggestions": sum(len(f["suggestions"]) for f in out),
        "items": out,
    }
