## Critical Issues
- **SQL Injection (CWE-89)** — `examples/sql-injection.py:21-23`  
  Dynamic SQL built via string concatenation enables auth bypass (e.g., `admin' --`).
- **Command Injection (CWE-78)** — `examples/command-injection.py:19-22,28`  
  User input reaches shell commands (`shell=True`, `os.system`), enabling arbitrary command execution.
- **XSS (CWE-79)** — `examples/xss-vulnerability.js:20-28,34`  
  Unescaped reflected output and unsafe DOM sink (`innerHTML`) allow script injection.
- **Path Traversal (CWE-22)** — `examples/path-traversal.py:24,33`  
  Unsanitized filename/path joins allow reading files outside intended directory (`../../etc/passwd`).
- **Hardcoded Secrets (CWE-798)** — `examples/hardcoded-secret.js:16-20`  
  Embedded credentials/secrets can be exfiltrated and abused.

## Warnings
- Repository appears to intentionally contain vulnerable examples under `examples/`; risk is **critical** if reused in real environments.
- **Auth/crypto implementation is incomplete/not shown** in sampled files, so full auth/authorization and JWT/crypto posture cannot be fully validated.
- No concrete insecure deserialization usage identified in current findings.

## Suggestions
- Replace string-built SQL with parameterized queries/prepared statements.
- Remove shell execution of user input (`shell=True` / `os.system`); use safe argument lists and strict input validation.
- Encode/escape output; avoid `innerHTML` for untrusted data (`textContent`/safe templating).
- Canonicalize and validate file paths; enforce allowlisted directories and basename checks.
- Rotate exposed secrets immediately; move to env vars/secret manager and add secret scanning in CI.
- Add security tests (SAST + dependency scan + negative tests for these vectors) and block merges on high/critical findings.

## Human Review Needed (YES/NO)
**YES** — to confirm production exposure, validate auth/authorization logic not present in these files, and verify crypto/JWT configuration details.
