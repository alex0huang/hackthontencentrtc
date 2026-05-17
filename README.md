# SecReviewer 🛡️

> **AI-powered security guard for every `git push`. Built on AdaL.**

AI coding agents are powerful — but they have a permission problem. People hit `--yolo`, click "allow always", and stop reading what the agent is actually doing. Then an API key gets committed, an auth check gets removed, or SQL injection gets shipped — and nobody notices until production is on fire.

**SecReviewer doesn't ask for permission. It just stops bad code from leaving your laptop.**

---

## What's in here

This monorepo has two pieces that work together:

```
.
├── sec-reviewer/      # the security guard
│   ├── install.sh         → one-line installer that drops a pre-push git hook
│   ├── install/           → optional GitHub Actions workflow (for PR-time review)
│   └── examples/          → intentionally vulnerable code for testing
│
└── adal-dashboard/    # the web dashboard
    ├── frontend/          → React + Vite + Tailwind (landing + dashboard pages)
    └── backend/           → FastAPI + SQLite + httpx
```

| Piece | What it does |
| --- | --- |
| **`sec-reviewer`** | Runs AdaL on every `git push` diff. Verdict: `PASS` or `BLOCK`. If `BLOCK`, the push is rejected locally — bad code never reaches GitHub. |
| **`adal-dashboard`** | Sign in with GitHub. See every review (PR comments, commit comments, and local-blocked pushes) in one feed, grouped by severity. |

---

## How it works

```
   developer's laptop                         GitHub                  this dashboard
   ─────────────────                          ──────                  ──────────────
                                                                            ▲
   $ git push                                                               │
        │                                                                   │
        ▼                                                                   │
   pre-push hook ──► adal -q "review this diff" ──► VERDICT: PASS ──► push ─┤
        │                                                                   │
        │                                                  ┌─ posts ────────┤
        │                                                  │   commit       │
        │                                                  │   comment      │
        ▼                                                                   │
   VERDICT: BLOCK ──► push rejected (exit 1) ──► writes ~/.adal/sec-review.log
                                                          │                 │
                                                          └─ read by ───────┘
                                                              backend
```

Three layers, all powered by **AdaL** (SylphAI's agent):

1. **Install** — one `curl ... | bash`. Drops a pre-push git hook into the current repo.
2. **Hook → AdaL** — on every `git push`, the hook pipes the diff to `adal -q "..."` with a security-reviewer prompt. AdaL returns a markdown report with `VERDICT: PASS` or `VERDICT: BLOCK`, file:line evidence, and suggested fixes.
3. **Dashboard** — aggregates three sources:
   - **PR comments** posted by the legacy GitHub Action workflow
   - **Commit comments** posted by the pre-push hook on successful pushes
   - **Local blocked pushes** parsed from `~/.adal/sec-review.log` (since blocked commits never reach GitHub, this is the only place they exist)

The dashboard is read-only and pulls from the GitHub API on demand. Nothing is pushed from your machine to a separate server — the local log stays local.

---

## Quick start

### 1. Install the guard in a repo

```bash
cd your-repo
curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthonadal/main/sec-reviewer/install.sh | bash
```

The installer:
- Verifies prerequisites (git repo, Node ≥ 20)
- Installs `@sylphai/adal-cli` globally if missing
- Triggers AdaL first-time login (interactive)
- Installs `.git/hooks/pre-push`

After this, every `git push` from the repo is reviewed by AdaL. Bypass (not recommended): `git push --no-verify`.

### 2. Run the dashboard

```bash
# backend
cd adal-dashboard/backend
pip install -r requirements.txt
export GITHUB_CLIENT_ID=...        # from https://github.com/settings/developers
export GITHUB_CLIENT_SECRET=...
uvicorn main:app --reload --port 8000

# frontend (separate terminal)
cd adal-dashboard/frontend
npm install
npm run dev                        # http://localhost:5173
```

**GitHub OAuth App settings:**
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:8000/auth/github/callback`

Open <http://localhost:5173> → **Sign in with GitHub** → see every SecReviewer review across your repos plus any pre-push blocks logged locally.

---

## Dashboard features

- **Findings feed** — every review as a card with severity badges (`✅ PASS` / `❌ BLOCK` / `🔴 critical` / `🟠 warnings` / `💡 suggestions`)
- **Expandable findings** — file path, line number, and AdaL's suggested fix for each issue
- **Filter chips** — `All / Critical / Warnings / Suggestions / Clean`
- **Repositories tab** — lists your GitHub repos and which ones have the SecReviewer GitHub Action installed
- **One-click install** on the landing page — paste `owner/repo`, click Install, GitHub opens with the workflow YAML pre-filled

---

## What AdaL catches

Driven by the prompt the hook sends — broad categories:

| Category | Examples |
| --- | --- |
| **Injection** | SQLi, XSS, command injection, path traversal |
| **Secrets** | API keys, DB passwords, JWT secrets, private keys |
| **Auth** | Broken auth flows, missing authorization checks, removed guards |
| **Crypto** | Weak hashes (MD5/SHA1), hardcoded IVs, broken TLS settings |
| **Deserialization** | `pickle.loads`, unsafe `yaml.load`, `eval` on user input |
| **SSRF / CORS** | Unvalidated URL fetches, wildcard origins, missing CSP |
| **Risky deletions** | Removed auth checks, deleted security tests, dropped CSRF protection |

It's the same prompt in both the pre-push hook (`install.sh`) and the GitHub Action (`install/sec-review.yml`) — change the prompt to tune what it flags for your stack.

---

## Architecture notes

- **Backend** (`adal-dashboard/backend/main.py`) is a single-file FastAPI app, ~280 lines. SQLite at `~/.adal/dashboard.db` stores users, sessions, and OAuth state.
- **Frontend** (`adal-dashboard/frontend/src/`) is plain React + React Router. No state library — fetch on mount, `useState` for the rest.
- **Hook** (`sec-reviewer/install.sh`) is pure bash. No daemon, no background process — it runs only when you `git push`.
- **No telemetry, no external server.** The dashboard backend runs on your machine; the GitHub token never leaves it.

---

## Roadmap — The AdaL Expert Pack

SecReviewer is the first of a family. Same install pattern, different specialty:

- 🛡️ **SecReviewer** — security review *(shipped)*
- ⚡ **PerfReviewer** — N+1 queries, slow regex, memory leaks *(next)*
- 🎨 **StyleReviewer** — codebase-aware style + naming consistency *(next)*
- 📊 **SecReviewer Hub** — org-wide dashboard, severity trends *(concept)*

---

## Credits

- **[AdaL](https://adalagent.ai)** — the AI agent doing the actual reasoning
- **[SylphAI](https://sylph.ai)** — building AdaL
- Built at the SylphAI Hackathon, 2026

## License

MIT — see [LICENSE](./sec-reviewer/LICENSE).
