## Critical Issues
- **SQL Injection (CWE-89)** — `examples/sql-injection.py:21-22`  
  User-controlled `username/password` are concatenated into SQL.
- **OS Command Injection (CWE-78)** — `examples/command-injection.py:19-21, 28`  
  Uses `shell=True` with interpolated input and `os.system(...)` on untrusted data.
- **Path Traversal (CWE-22)** — `examples/path-traversal.py:24, 33`  
  Unvalidated filename/path input enables access outside intended directory.
- **Reflected/DOM XSS (CWE-79)** — `examples/xss-vulnerability.js:20-28, 34`  
  Untrusted input reflected into HTML and written via `innerHTML`.
- **Hardcoded Secrets (CWE-798)** — `examples/hardcoded-secret.js:16-20`  
  Plaintext AWS/DB/Stripe credentials in source.

## Warnings
- **Authentication/Authorization flaws:** No concrete critical authz/authn defect identified in reviewed files; broader app flow not fully validated.
- **Crypto weaknesses:** No obvious weak crypto pattern observed in surfaced files; deeper review of all crypto usage recommended.
- **Insecure deserialization:** No direct unsafe deserialization sink found in surfaced files; confirm across full code paths.

## Suggestions
- Replace string-built SQL with parameterized queries everywhere.
- Remove `shell=True`/`os.system` for user input; use allowlists + argument arrays.
- Normalize and validate paths (`resolve()` + boundary checks).
- Apply output encoding/safe templating; avoid `innerHTML` with untrusted data.
- Move all secrets to env/secret manager; rotate exposed keys immediately.
- Use `examples/safe-code.py` patterns as baseline secure implementations.

## Human Review Needed (YES/NO)
**YES** — findings are high confidence, and auth/crypto/deserialization require full manual end-to-end verification beyond the sampled files.
