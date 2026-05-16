## Critical Issues
- **SQL Injection (CWE-89)** — `examples/sql-injection.py:21-23`  
  User input is concatenated into SQL query strings before `cursor.execute(query)`, enabling auth bypass/data exfiltration.
- **Command Injection (CWE-78)** — `examples/command-injection.py:19-22, 28`  
  Untrusted input reaches shell commands via `subprocess.check_output(..., shell=True)` and `os.system(...)`.
- **Path Traversal (CWE-22)** — `examples/path-traversal.py:24-25, 33-34`  
  File paths built from unvalidated user input (`os.path.join`/direct open) allow `../` traversal.
- **Reflected/DOM XSS (CWE-79)** — `examples/xss-vulnerability.js:20-28, 34`  
  Unescaped user-controlled values are rendered into HTML/DOM.
- **Hardcoded Secrets (CWE-798)** — `examples/hardcoded-secret.js:16-20`  
  Embedded AWS/DB/JWT/Stripe credentials in source code.

## Warnings
- **Auth flaws**: No additional concrete authz/authn logic flaws confirmed beyond SQLi-enabled auth bypass in the sample code.
- **Crypto weaknesses**: No concrete weak crypto implementation confirmed from reviewed snippets.
- **Insecure deserialization**: No concrete insecure deserialization sink confirmed from reviewed snippets.

## Suggestions
- Use parameterized queries/prepared statements for all DB access.
- Remove `shell=True`; use argument arrays and strict allowlists for command inputs.
- Canonicalize + validate file paths; enforce base-directory containment.
- Apply context-aware output encoding and safe templating; avoid raw HTML insertion.
- Rotate/revoke exposed keys immediately; move secrets to env/secret manager and add secret scanning in CI.
- Add SAST/DAST + dependency and secret scanning gates in CI for regression prevention.

## Human Review Needed
**YES** — Verify `web/app/page.tsx` for React XSS sinks (e.g., `dangerouslySetInnerHTML`) and review `reviews/` consistency against current code.
