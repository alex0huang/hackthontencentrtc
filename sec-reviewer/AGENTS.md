# AGENTS.md

This file provides guidance to agents (i.e., ADAL) when working with code in this repository.

## Scope of this repository

This is **not** a source-code monorepo. It is a local, npm-global style installation of `@sylphai/adal-cli` under:

- `虚拟环境1/npm-global/...`

So most tasks here are:
- operating the installed CLI,
- inspecting packaged runtime/wrapper behavior,
- documenting/debugging install/runtime issues,

—not implementing feature code with local build/test pipelines.

---

## 30-second command map (most important)

### Activate local environment shim
```bash
source 虚拟环境1/activate.sh
```
What it does:
- prepends `虚拟环境1/npm-global/bin` to `PATH`
- validates by printing `adal --version` if available

### Core CLI usage
```bash
adal
adal --help
adal --version
adal --ide
adal --web          # deprecated alias for --ide
adal -q "your query"
adal -q "your query" -m openai-gpt-5.4 --output json
adal -q "continue this" -r <session-id>
```

### Tool-approval controls (headless)
```bash
adal -q "task" --allowed-tools "Bash,Edit"
adal -q "task" --yolo
```

### Plugin/worktree commands
```bash
adal plugin list
adal plugin marketplace add <src>
adal plugin install <name@marketplace>
adal worktree <cmd>
```

---

## Essential commands by subsystem

Because this repository is a packaged distribution, there are **no project build/lint/test scripts** at root.

### Shell + environment subsystem
- Activate env: `source 虚拟环境1/activate.sh`
- Check shim: `which adal`
- Inspect npm prefix: `cat 虚拟环境1/.npmrc`

### CLI runtime subsystem (`@sylphai/adal-cli`)
- Entrypoint command: `adal` (symlink in `虚拟环境1/npm-global/bin/adal`)
- Wrapper script path:
  - `虚拟环境1/npm-global/lib/node_modules/@sylphai/adal-cli/bin/adal-cli.js`
- Help / usage:
  - `虚拟环境1/npm-global/bin/adal --help`

### Build/test/lint status (critical truth)
- `package.json` in `@sylphai/adal-cli` has only:
  - `"postinstall": "node lib/setup-cache.js"`
- No `build`, `test`, `lint`, or single-test scripts are exposed in this checkout.

If you need to run source tests, you must clone the upstream source repository:
- `https://github.com/SylphAI-Inc/adal-cli.git`
(and run commands there, not in this installation directory).

---

## Critical gotchas (read before changing anything)

1. **Node requirement**
   - `@sylphai/adal-cli/package.json` requires:
     - `"node": ">=20.0.0"`

2. **Platform-specific package resolution**
   - Main wrapper maps `{platform, arch}` to one optional package:
     - e.g. `darwin-arm64 -> @sylphai/adal-cli-darwin-arm64`
   - Unsupported platform exits early with an error.

3. **Cached platform path behavior**
   - Cache file:
     - `虚拟环境1/npm-global/lib/node_modules/@sylphai/adal-cli/.cache/platform-path.json`
   - Runtime wrapper prefers cached wrapper path if valid and fresh (<30 days).
   - Wrapper intentionally rejects stale cache values pointing at `adal-cli.js` (expects `adal`/`adal.cmd` wrapper path).

4. **Bundled runtime, not system Bun**
   - Platform launcher script (`.../adal-cli-darwin-arm64/adal`) executes:
     - `runtime/bun` + `adal-cli.js`
   - Do not assume globally installed Bun is used.

5. **`--web` is deprecated**
   - Help text: `--web` is deprecated alias for `--ide`.
   - Changelog still references `adal --web` in older entries; prefer `--ide` in new docs.

6. **This repo has huge packaged assets**
   - Recursive listing can produce very large output.
   - Use targeted reads/greps; avoid broad recursive dumps unless necessary.

---

## Non-obvious architecture & execution flow

### High-level flow
1. User runs `adal` from `虚拟环境1/npm-global/bin/adal` (symlink).
2. Symlink points to Node wrapper:
   - `@sylphai/adal-cli/bin/adal-cli.js`
3. Node wrapper:
   - detects platform/arch,
   - resolves platform package name,
   - loads/validates cached wrapper path,
   - falls back to search/`require.resolve`,
   - spawns platform wrapper binary/script.
4. Platform wrapper (`@sylphai/adal-cli-darwin-arm64/adal`) runs:
   - `runtime/bun adal-cli.js ...args`
5. Bundled app then loads packaged backend/web/tui assets (inside platform package).

### Why this matters operationally
- Failures may occur in different layers:
  - PATH/symlink layer,
  - Node platform resolver layer,
  - cache layer,
  - platform package layer,
  - bundled runtime layer.
- Debug by identifying which layer failed first.

---

## Key entry points and critical files

### User-facing entry points
- `虚拟环境1/activate.sh` — local env activation helper
- `虚拟环境1/npm-global/bin/adal` — command shim/symlink

### Main package (`@sylphai/adal-cli`)
- `.../package.json` — engine + optionalDependencies + postinstall
- `.../bin/adal-cli.js` — platform detection, cache validation, spawn logic
- `.../lib/setup-cache.js` — postinstall cache writer
- `.../lib/platform-resolver.js` — reusable platform resolver helpers
- `.../.cache/platform-path.json` — resolved platform wrapper location cache
- `.../CHANGELOG.md` — release history and behavior notes

### Platform package (darwin-arm64 in this environment)
- `.../node_modules/@sylphai/adal-cli-darwin-arm64/package.json`
- `.../node_modules/@sylphai/adal-cli-darwin-arm64/adal` (launcher script)
- package metadata indicates:
  - `_adalRuntime: "bun"`
  - `_adalBackendLocation: "backend/adal-backend/adal-backend"`

---

## Domain-specific workflow notes for this repo

1. This workspace behaves like an **installation artifact**:
   - prioritize diagnosis/documentation over refactoring.
2. For command validation, use the local shim path directly when PATH is unclear:
   - `虚拟环境1/npm-global/bin/adal --help`
3. For architecture claims, prefer file-backed evidence from wrapper scripts/package manifests, not assumptions from changelog marketing text.
4. If asked for build/test internals, explicitly state missing source pipeline in this checkout and redirect to upstream source repo.

---

## Fast troubleshooting playbook

### `adal` not found
1. Run: `source 虚拟环境1/activate.sh`
2. Verify: `which adal`
3. Verify symlink target exists:
   - `ls -la 虚拟环境1/npm-global/bin/adal`

### Platform package not found error
- Check platform cache file and path validity:
  - `虚拟环境1/npm-global/lib/node_modules/@sylphai/adal-cli/.cache/platform-path.json`
- Confirm expected platform package directory exists under:
  - `.../adal-cli/node_modules/@sylphai/`

### Node engine mismatch
- Ensure Node >= 20 before running the Node wrapper layer.

---

## What not to assume in this repository

- Do **not** assume root-level `README.md`, `pyproject.toml`, or workspace `package.json` exist.
- Do **not** assume local `npm run test`/`npm run build` targets are available.
- Do **not** treat this as the editable source repo for AdaL itself without cloning upstream source.
