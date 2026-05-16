# SecReviewer Dashboard

A web app that:
- Shows the **SecReviewer install guide** (landing page with one-click install onto a GitHub repo)
- Lets users **sign in with GitHub OAuth**
- Aggregates every **SecReviewer report** posted on the user's pull requests into one dashboard
- Surfaces totals (Critical / Warnings / Suggestions) and a per-PR breakdown of findings

Stack: React + Vite + Tailwind (frontend) · FastAPI + SQLite + httpx (backend).

## 1. Register a GitHub OAuth App

1. Go to https://github.com/settings/developers → **New OAuth App**
2. Fill in:
   - **Application name**: SecReviewer Dashboard (anything)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:8000/auth/github/callback`
3. After creating, generate a **client secret**.
4. Copy the **Client ID** and **Client Secret**.

## 2. Run the backend

```bash
cd backend
export GITHUB_CLIENT_ID=YOUR_CLIENT_ID
export GITHUB_CLIENT_SECRET=YOUR_CLIENT_SECRET
# optional overrides:
# export FRONTEND_URL=http://localhost:5173
# export BACKEND_URL=http://localhost:8000
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Open http://localhost:5173 → **Sign in with GitHub** → see every SecReviewer finding across your PRs.

## How findings get into the dashboard

1. Install the SecReviewer GitHub Action on a repo (the landing page has a one-click installer).
2. Open a PR — the Action runs `adal` on the diff and posts a `🛡️ SecReviewer Report` comment.
3. The dashboard reads the user's PR comments via the GitHub API (using their OAuth token) and parses every comment that contains `SecReviewer Report` into structured findings.

No data is pushed from the Action to a separate server — everything stays in GitHub. The dashboard is a read-only aggregator.

## Endpoints

- `GET /auth/github/start` — kicks off OAuth
- `GET /auth/github/callback` — completes OAuth, redirects to `/auth/callback?token=…`
- `GET /me` — current user
- `GET /repos` — user's repos (with `sec_reviewer_installed` flag)
- `GET /findings` — parsed SecReviewer reports across the user's PRs
- `POST /logout` — invalidates the current session

## Notes

- The DB lives at `~/.adal/dashboard.db`. Delete it to reset all users/sessions.
- The GitHub token is stored server-side, scoped to `repo read:user user:email`.
- Findings parsing is markdown-based (matches the bot's comment format from the GitHub Action YAML).
