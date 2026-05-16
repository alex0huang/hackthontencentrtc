# AdaL Security Guard 🛡️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Powered by AdaL](https://img.shields.io/badge/Powered%20by-AdaL-ec4899)](https://adalagent.ai)

> **AI-powered security review on every `git push`.** One install command — AdaL reviews your diff, blocks risky pushes, and posts the review as a commit comment on GitHub.

---

## ✨ Features

- 🤖 **AI-driven, not regex** — [AdaL](https://adalagent.ai) reasons about data flow and explains *why* a finding matters
- 🚧 **Fail-closed pre-push hook** — risky diffs are blocked before they reach the remote
- 💬 **Auto commit comments** — the review is posted to the pushed commit on GitHub (via `gh` CLI)
- 🗑️ **Catches risky deletions** — flags removed auth checks, validation, security headers, etc.
- ⚡ **One-line install** — no API keys, no CI config

---

## 🚀 Quick Start

### Prerequisites
- **Node.js ≥ 20** (`node -v`)
- **Git** (you're in a git repo)
- **[AdaL CLI](https://adalagent.ai)** session — first run launches login
- *(optional, for commit comments)* **[GitHub CLI](https://cli.github.com)** authenticated: `gh auth login`

### Install (run inside any git repo)

```bash
curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthonadal/main/install.sh | bash
```

What it does:
1. Verifies prerequisites (git, Node ≥ 20)
2. Installs `@sylphai/adal-cli` globally if missing
3. Triggers first-time AdaL login (interactive)
4. Installs a `pre-push` hook in `.git/hooks/pre-push`

### Use it

Just `git push` as usual. You'll see:

```
[adal-guard] 🛡️  Running AdaL security review before pushing to origin...
[adal-guard] Calling adal (may take 30-90s)...

===== AdaL Security Review =====
VERDICT: PASS
...
================================

[adal-guard] ✅ Security review passed.
[adal-guard] 💬 Comment will be posted on owner/repo@<sha> after push completes.
```

The review then appears as a **commit comment** on GitHub within ~5–20 seconds.

---

## 🛡️ What it catches

| Category | Examples |
| --- | --- |
| **Injection** | SQLi, XSS, command injection, path traversal |
| **Secrets** | API keys, DB passwords, JWT secrets in source |
| **Auth** | Broken auth flows, missing authorization checks |
| **Crypto** | Weak algorithms, hardcoded IVs, MD5/SHA1 misuse |
| **Deserialization** | `pickle`, unsafe `JSON.parse`, YAML `load` |
| **Risky deletions** | Removed auth checks, validation, security headers, audit logs |

---

## 📋 Verdicts

| Verdict | Behavior |
| --- | --- |
| `VERDICT: PASS` | Push proceeds. Comment posted to commit (if `gh` available). |
| `VERDICT: BLOCK` | Push aborted (fail-closed). Comment still posted. Bypass: `git push --no-verify`. |
| AdaL error / no verdict | Push aborted (fail-closed). |

---

## 💬 Commit Comments (optional)

Comments require [`gh` CLI](https://cli.github.com) installed and authenticated:

```bash
gh auth login   # GitHub.com → HTTPS → web browser
```

If `gh` is missing or unauthenticated, the hook skips commenting silently — your push is unaffected.

Logs (including comment-post status): `~/.adal/sec-review.log`

---

## 🧪 Try it on the demo

```bash
# Clone, then push a demo file to see PASS / BLOCK in action
git clone https://github.com/alex0huang/hackthonadal.git
cd hackthonadal
curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthonadal/main/install.sh | bash
# examples/passes_check.py  → PASS
# examples/vuln_app.py      → BLOCK
```

---

## 🔧 Uninstall

```bash
rm .git/hooks/pre-push
```

To bypass once without uninstalling: `git push --no-verify`.

---

## 🙏 Credits

- **[AdaL](https://adalagent.ai)** — the AI agent doing the actual reasoning
- **[SylphAI](https://sylph.ai)** — building AdaL
- Built at the SylphAI Hackathon, 2026

---

## 📄 License

MIT — see [LICENSE](./LICENSE).
