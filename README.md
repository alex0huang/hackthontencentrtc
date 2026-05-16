# SecReviewer 🛡️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Powered by AdaL](https://img.shields.io/badge/Powered%20by-AdaL-ec4899)](https://adalagent.ai)
[![GitHub stars](https://img.shields.io/github/stars/your-org/sec-reviewer?style=social)](#)

> **AI-powered security review for every Pull Request.** Drop in one YAML file, get a senior security engineer on every PR.

![SecReviewer demo](./docs/demo.gif)
<!-- Replace docs/demo.gif with your real recording -->

---

## ✨ Features

- 🤖 **AI-driven, not regex** — uses [AdaL](https://adalagent.ai) to reason about code, trace data flow, and explain *why* a finding matters
- 🔴 **Severity-grouped output** — Critical / Warnings / Suggestions, each with file:line + suggested fix + OWASP link
- 💬 **Native PR comments** — no separate dashboard, results show up where developers already work
- ⚡ **Zero config** — one YAML file, one secret, done
- 🧪 **Demo samples included** — `examples/` ships intentionally vulnerable code so you can verify the reviewer works

---

## 🚀 Quick Start

**1. Add the workflow** to your repo at `.github/workflows/sec-review.yml`:

```bash
mkdir -p .github/workflows
curl -o .github/workflows/sec-review.yml \
  https://raw.githubusercontent.com/your-org/sec-reviewer/main/install/sec-review.yml
```

**2. Add your Anthropic API key** at *Settings → Secrets and variables → Actions*:

| Name                  | Value                                                                |
| --------------------- | -------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Get one at [console.anthropic.com](https://console.anthropic.com)    |

**3. Open a PR.** SecReviewer comments automatically.

---

## 📋 Example Output

```markdown
# 🛡️ SecReviewer Report

## 🔴 Critical Issues
- **src/auth.py:23** — SQL injection: user input concatenated into query.
  Fix: use parameterized queries — `cursor.execute("... WHERE u = ?", (user,))`
- **src/config.js:8** — Hardcoded Stripe API key (`sk_live_...`).
  Fix: move to env var, rotate the key, scrub git history.

## 🟠 Warnings
- **src/upload.py:45** — Path traversal possible. Validate filename against base dir.

## 💡 Suggestions
- Consider adding `Content-Security-Policy` header to `app.py:12`.

## 👀 Human Review Needed?
**YES** — credential leak and SQLi must be fixed before merge.

## 📚 Learn More
- SQL Injection — https://owasp.org/www-community/attacks/SQL_Injection
- Hardcoded Credentials — https://cwe.mitre.org/data/definitions/798.html
```

---

## 🛡️ What it catches

| Category                   | Examples                                            |
| -------------------------- | --------------------------------------------------- |
| **Injection**              | SQLi, XSS, command injection, path traversal        |
| **Secrets**                | API keys, DB passwords, JWT secrets in source       |
| **Auth**                   | Broken auth flows, missing authorization checks     |
| **Crypto**                 | Weak algorithms, hardcoded IVs, MD5/SHA1 misuse     |
| **Deserialization**        | `pickle`, unsafe `JSON.parse`, YAML `load`          |
| **CORS / CSP**             | Wildcard origins, missing security headers          |
| **Sensitive data exposure**| PII / credentials in logs, debug output             |

---

## 🔧 Configuration

Required:

- `ANTHROPIC_API_KEY` — your [Anthropic API key](https://console.anthropic.com).

Optional (edit the workflow YAML directly):

- Trigger branches (default: `main`, `master`)
- Custom prompt — tailor for your stack, compliance framework (PCI/HIPAA/SOC2), or specific CWEs
- Output filtering — change severity thresholds in the prompt

---

## 🗺️ Roadmap — The AdaL Expert Pack

SecReviewer is the first of a family. Same install pattern, different specialty:

- 🛡️ **SecReviewer** — Security review *(shipped)*
- ⚡ **PerfReviewer** — N+1 queries, slow regex, memory leaks *(next)*
- 🎨 **StyleReviewer** — Codebase-aware style + naming consistency *(next)*
- 📊 **SecReviewer Hub** — Org-wide dashboard, severity trends *(concept)*

Have an idea for the Pack? Open an issue.

---

## 🙏 Credits

- **[AdaL](https://adalagent.ai)** — the AI agent doing the actual reasoning
- **[SylphAI](https://sylph.ai)** — building AdaL
- Built at the SylphAI Hackathon, 2026

---

## 📄 License

MIT — see [LICENSE](./LICENSE).
