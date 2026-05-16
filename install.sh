#!/usr/bin/env bash
# AdaL Security Guard — one-shot installer
# Usage (from inside a target git repo):
#   curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthonadal/main/install.sh | bash
#
# What it does:
#   1. Verifies prerequisites (git repo, node >= 20)
#   2. Installs @sylphai/adal-cli globally if missing
#   3. Triggers first-time login (interactive)
#   4. Installs a pre-push hook that runs an AdaL security review on every push
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[adal-guard]${NC} $*"; }
warn() { echo -e "${YELLOW}[adal-guard]${NC} $*"; }
die()  { echo -e "${RED}[adal-guard]${NC} $*" >&2; exit 1; }

# --- 1. sanity checks -------------------------------------------------------
git rev-parse --git-dir >/dev/null 2>&1 || die "Not inside a git repository."
GIT_DIR="$(git rev-parse --git-dir)"

command -v node >/dev/null 2>&1 || die "node is required (>=20). Install from https://nodejs.org"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node >= 20 required (found $(node -v))."

command -v npm >/dev/null 2>&1 || die "npm is required."

# --- 2. install adal cli ----------------------------------------------------
if ! command -v adal >/dev/null 2>&1; then
  log "Installing @sylphai/adal-cli globally..."
  npm install -g @sylphai/adal-cli --silent || die "npm install failed."
else
  log "adal already installed: $(adal --version 2>/dev/null || echo 'unknown')"
fi

# --- 3. first-time login ----------------------------------------------------
if [ ! -d "$HOME/.adal" ] || [ -z "$(ls -A "$HOME/.adal" 2>/dev/null || true)" ]; then
  warn "No AdaL session found. Launching interactive login..."
  warn "Complete login in the AdaL UI, then exit (Ctrl+C or /exit) to continue."
  adal || true
else
  log "Existing AdaL session detected at ~/.adal"
fi

# --- 4. install pre-push hook ----------------------------------------------
HOOK_PATH="$GIT_DIR/hooks/pre-push"
log "Installing pre-push hook -> $HOOK_PATH"

cat > "$HOOK_PATH" <<'HOOK'
#!/usr/bin/env bash
# AdaL Security Guard — pre-push hook
# Aborts push if AdaL flags critical security issues in the diff.
# Designed to work both in interactive shells AND non-TTY environments
# (e.g., when an AI agent runs `git push` via a subprocess).
set -euo pipefail

LOG_FILE="${HOME}/.adal/sec-review.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# All user-facing messages go to stderr so they survive stdout capture/redirection.
say() { echo "[adal-guard] $*" >&2; echo "[adal-guard] $*" >> "$LOG_FILE" 2>/dev/null || true; }

if ! command -v adal >/dev/null 2>&1; then
  say "adal not found on PATH; skipping security review."
  exit 0
fi

REMOTE="${1:-origin}"; URL="${2:-unknown}"
say "🛡️  Running AdaL security review before pushing to $REMOTE ($URL)..."

# Read ref list from git on stdin: <local_ref> <local_sha> <remote_ref> <remote_sha>
DIFF=""
while read -r local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
  if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    DIFF+="$(git show --no-color "$local_sha" 2>/dev/null || true)"$'\n'
  else
    DIFF+="$(git diff --no-color "$remote_sha..$local_sha" 2>/dev/null || true)"$'\n'
  fi
done

if [ -z "${DIFF// }" ]; then
  say "No diff to review; allowing push."
  exit 0
fi

# Truncate very large diffs (~200KB) so the prompt stays sane.
MAX=200000
if [ "${#DIFF}" -gt "$MAX" ]; then
  DIFF="${DIFF:0:$MAX}

[...diff truncated for review...]"
fi

PROMPT="You are a strict security reviewer for a git pre-push hook. Review the diff below for TWO categories of risk:

== CATEGORY A: Newly introduced vulnerabilities (added '+' lines) ==
Hardcoded secrets/credentials, SQL/command injection, unsafe deserialization, weak crypto,
path traversal, SSRF, XSS, insecure auth, RCE sinks, etc.

== CATEGORY B: Risky DELETIONS (removed '-' lines) ==
Pay SPECIAL attention to deleted lines. Treat as Critical/High when the deletion removes:
  1. Authentication / authorization checks (login required, role checks, permission guards)
  2. Input validation, sanitization, or escaping
  3. CSRF / XSS protections, security headers, CORS restrictions
  4. Cryptographic operations (signature verification, hash compare, TLS settings)
  5. Rate limiting, audit logging, or security-relevant logging
  6. Security tests / assertions
  7. Secret-handling code (env-var loads, secret rotation)
  8. Access-control middleware, guards, decorators
  9. Error handling around security-sensitive operations
 10. SECURITY.md, security policies, or comments warning of security risk
 11. Files entirely deleted that match patterns: *security*, *auth*, *guard*, *.env.example,
     SECURITY.md, *permission*, *acl* — flag as High and ask for confirmation

For each removed control, explain WHY removing it is dangerous and ask whether the deletion
is intentional with a documented replacement.

== OUTPUT FORMAT ==
FIRST LINE must be exactly one of:
VERDICT: PASS    (no Critical/High issues in either category)
VERDICT: BLOCK   (any Critical/High issue, including risky deletions)

Then list findings under these sections (omit empty ones):
### 🆕 New Vulnerabilities
### 🗑️  Risky Deletions
### ℹ️  Notes / Suggestions

Each finding: severity, file:line, what changed (added/removed), why it matters, suggested fix.

DIFF:
$DIFF"

say "Calling adal (may take 30-90s)..."

# Pass prompt as argument (not via stdin) — works reliably without a TTY.
# Capture exit code separately so we can fail-closed on adal errors.
set +e
OUTPUT="$(adal -q "$PROMPT" --yolo --output text 2>&1 </dev/null)"
ADAL_EXIT=$?
set -e

# Echo full review to stderr (visible to humans AND agents) and to log file.
{
  echo ""
  echo "===== AdaL Security Review ====="
  echo "$OUTPUT"
  echo "================================"
  echo ""
} >&2
echo "$OUTPUT" >> "$LOG_FILE" 2>/dev/null || true

# Fail-closed: any adal failure → BLOCK (previous version silently allowed).
if [ "$ADAL_EXIT" -ne 0 ]; then
  say "❌ adal exited with code $ADAL_EXIT. Push BLOCKED (fail-closed)."
  say "   See log: $LOG_FILE"
  say "   Bypass:  git push --no-verify"
  exit 1
fi

if printf '%s' "$OUTPUT" | grep -qE '^VERDICT:[[:space:]]*BLOCK'; then
  say "❌ Critical security issues found. Push BLOCKED."
  say "   Bypass: git push --no-verify"
  COMMENT_SHA="${COMMENT_SHA:-$(git rev-parse HEAD 2>/dev/null || true)}"
  [ -n "$COMMENT_SHA" ] && post_commit_comment "$COMMENT_SHA" "BLOCK" || true
  exit 1
fi

post_commit_comment() {
  # Post the AdaL review as a GitHub commit comment (best-effort).
  # Requires `gh` CLI installed + authenticated. Silently skips otherwise.
  local sha="$1"
  local verdict="$2"
  command -v gh >/dev/null 2>&1 || { say "gh CLI not found; skipping comment."; return 0; }
  gh auth status >/dev/null 2>&1 || { say "gh not authenticated; skipping comment."; return 0; }

  local repo_slug
  repo_slug="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  [ -z "$repo_slug" ] && { say "Could not detect GitHub repo; skipping comment."; return 0; }

  local emoji="✅"
  [ "$verdict" = "BLOCK" ] && emoji="❌"

  local body
  body="$(printf '<!-- adal-guard:commit-review -->\n# %s AdaL Security Review\n\n_Commit: `%s`_\n\n%s\n\n---\n_Posted by AdaL pre-push hook_' \
    "$emoji" "${sha:0:7}" "$OUTPUT")"

  if gh api "repos/$repo_slug/commits/$sha/comments" \
       -f body="$body" >/dev/null 2>&1; then
    say "💬 Posted review as commit comment on $repo_slug@${sha:0:7}."
  else
    say "Could not post commit comment (non-fatal)."
  fi
}

# Use the most recent local SHA we saw on stdin for the comment target.
COMMENT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"

if printf '%s' "$OUTPUT" | grep -qE '^VERDICT:[[:space:]]*PASS'; then
  say "✅ Security review passed."
  [ -n "$COMMENT_SHA" ] && post_commit_comment "$COMMENT_SHA" "PASS" || true
  exit 0
fi

# No verdict line at all → adal output was malformed/empty. Fail-closed.
say "⚠️  No VERDICT line in adal output. Push BLOCKED (fail-closed)."
say "   See log: $LOG_FILE"
say "   Bypass:  git push --no-verify"
exit 1
HOOK

chmod +x "$HOOK_PATH"
log "Installed pre-push hook."

log "Done. Every 'git push' from this repo will now be reviewed by AdaL."
log "Bypass (not recommended): git push --no-verify"
