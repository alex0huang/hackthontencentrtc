## Critical Issues
- **SQL Injection** — `examples/sql-injection.py:21-23`  
  User input is concatenated into SQL query strings (`cursor.execute(query)`), enabling injection.
- **Command Injection** — `examples/command-injection.py:19-22,28`  
  Uses `subprocess.check_output(..., shell=True)` and `os.system()` with user-controlled input.
- **XSS (Reflected/DOM)** — `examples/xss-vulnerability.js:20-28,34`  
  Untrusted input is injected into HTML/DOM without escaping.
- **Path Traversal** — `examples/path-traversal.py:24-25,32-34`  
  Attacker-controlled filename is used in file paths (`os.path.join`/string concat) without confinement checks.
- **Hardcoded Secrets** — `examples/hardcoded-secret.js:16-20`  
  Embedded AWS/JWT/DB/Stripe-style secrets in source.

## Warnings
- The vulnerable patterns above appear concentrated under **`examples/`** and look intentionally insecure for demo/testing.
- No clear evidence (from reviewed files) of:
  - **AuthN/AuthZ logic flaws**
  - **Crypto weaknesses** (weak algorithms, bad IV/salt handling, etc.)
  - **Insecure deserialization**
  These may simply be out of scope of this sample code.

## Suggestions
- Keep `examples/` isolated from production/runtime paths and CI release artifacts.
- Add repository guardrails:
  - secret scanning (e.g., gitleaks/trufflehog),
  - SAST policy to fail builds on injection patterns outside `examples/`.
- Add clear banners/docs that `examples/` are intentionally vulnerable.
- In real code, enforce:
  - parameterized SQL,
  - strict output encoding/sanitization,
  - no `shell=True` with untrusted input,
  - canonical path validation + base-dir enforcement,
  - env/vault-based secret management.

## Human Review Needed
**YES** — confirm intentionally vulnerable files are never imported/deployed in production and verify no additional risk in unreviewed runtime/config surfaces.
