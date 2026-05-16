#!/usr/bin/env bash
# AdaL Security Guard — one-shot installer
# Usage (from inside a target git repo):
#   curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthontencentrtc/main/install.sh | bash
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
set -euo pipefail

if ! command -v adal >/dev/null 2>&1; then
  echo "[adal-guard] adal not found on PATH; skipping security review." >&2
  exit 0
fi

REMOTE="$1"; URL="$2"
echo "[adal-guard] Running security review before pushing to $REMOTE ($URL)..."

# Collect ranges being pushed: <local_ref> <local_sha> <remote_ref> <remote_sha>
DIFF=""
while read -r local_ref local_sha remote_ref remote_sha; do
  [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
  if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    RANGE="$local_sha"        # new branch — review tip commit
    DIFF+="$(git show --no-color "$local_sha")"$'\n'
  else
    RANGE="$remote_sha..$local_sha"
    DIFF+="$(git diff --no-color "$RANGE")"$'\n'
  fi
done

if [ -z "${DIFF// }" ]; then
  echo "[adal-guard] No diff to review; allowing push."
  exit 0
fi

# Truncate very large diffs to keep prompt reasonable (~200KB)
MAX=200000
if [ "${#DIFF}" -gt "$MAX" ]; then
  DIFF="${DIFF:0:$MAX}

[...diff truncated for review...]"
fi

PROMPT='You are a strict security reviewer. Review the following git diff and identify any security issues (secrets, SQL injection, command injection, unsafe deserialization, weak crypto, hardcoded credentials, path traversal, SSRF, XSS, etc.).

Respond in this exact format on the first line:
VERDICT: PASS    (if no Critical/High issues)
or
VERDICT: BLOCK   (if any Critical/High issues found)

Then list findings with severity, file, and brief explanation.

DIFF:
'"$DIFF"

OUTPUT="$(printf '%s' "$PROMPT" | adal -q "$(cat)" --yolo --output text 2>&1 || true)"

echo "----- AdaL Security Review -----"
echo "$OUTPUT"
echo "--------------------------------"

if printf '%s' "$OUTPUT" | grep -qE '^VERDICT:[[:space:]]*BLOCK'; then
  echo "[adal-guard] ❌ Push BLOCKED by AdaL security review." >&2
  echo "[adal-guard] Fix the issues above, or bypass with: git push --no-verify" >&2
  exit 1
fi

echo "[adal-guard] ✅ Security review passed."
exit 0
HOOK

chmod +x "$HOOK_PATH"
log "Installed pre-push hook."

log "Done. Every 'git push' from this repo will now be reviewed by AdaL."
log "Bypass (not recommended): git push --no-verify"
