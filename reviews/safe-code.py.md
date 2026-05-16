## Critical Issues
1. **SQL Injection (CWE-89)**  
   - **File:** `examples/sql-injection.py:21-23`  
   - User-controlled `username/password` are concatenated into SQL query text and executed directly.  
   - **Risk:** Authentication bypass / arbitrary query manipulation.

2. **Command Injection (CWE-78)**  
   - **File:** `examples/command-injection.py:19-22,28`  
   - Uses interpolated shell commands with `shell=True` / `os.system(...)`.  
   - **Risk:** Arbitrary OS command execution.

3. **XSS (CWE-79)**  
   - **File:** `examples/xss-vulnerability.js:20-28,34`  
   - Reflected XSS via unsanitized template output and DOM XSS via `innerHTML`.  
   - **Risk:** Session theft, script execution in victim browser.

## Warnings
1. **Path Traversal (CWE-22)**  
   - **File:** `examples/path-traversal.py:24-25,33-34`  
   - Unvalidated filename joined/concatenated into file paths.  
   - **Risk:** Reading files outside intended directory.

2. **Hardcoded Secrets (CWE-798)**  
   - **File:** `examples/hardcoded-secret.js:16-20`  
   - Embedded AWS/DB/JWT/Stripe-style credentials in source.  
   - **Risk:** Credential leakage and account compromise.

3. **Auth flaws / crypto weaknesses / insecure deserialization**  
   - No concrete additional instances identified in non-example app code from current scan.

## Suggestions
- Replace string-built SQL with parameterized queries/prepared statements.
- Remove shell interpolation; use argument arrays and strict allowlists.
- Eliminate `innerHTML` with untrusted data; use escaped rendering (`textContent`, auto-escaping templates).
- Canonicalize and validate file paths; enforce base-directory containment checks.
- Move secrets to environment/secret manager; rotate exposed keys immediately.
- Add CI checks: SAST + secret scanning + dependency scanning.

## Human Review Needed
**YES** — because findings are concentrated in `examples/` (likely intentionally vulnerable test fixtures). Confirm whether these files are production-reachable or demonstration-only before triage/severity decisions.
