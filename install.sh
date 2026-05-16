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

PROMPT="You are a strict security reviewer. Review the following git diff and identify any security issues (secrets, SQL injection, command injection, unsafe deserialization, weak crypto, hardcoded credentials, path traversal, SSRF, XSS, etc.).

Respond on the FIRST LINE with exactly one of:
VERDICT: PASS    (if no Critical/High issues)
VERDICT: BLOCK   (if any Critical/High issues found)

Then list findings with severity, file, and brief explanation.

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
  exit 1
fi

if printf '%s' "$OUTPUT" | grep -qE '^VERDICT:[[:space:]]*PASS'; then
  say "✅ Security review passed."
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
