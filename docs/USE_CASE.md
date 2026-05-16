# SecReviewer — A Vertical Application of AdaL

> A product brief for SylphAI · Author: [Your Name] · 2026

---

## 1. The Idea in One Line

**SecReviewer** turns AdaL into a senior security engineer that reviews every Pull Request — installable as a single GitHub Action YAML, no SDK required.

---

## 2. Why This, Why Now

Code review is the last line of defense before vulnerabilities ship. But:

- **Static scanners** (Semgrep, Snyk) catch known patterns, miss context. They flag `eval()` but can't tell that the input is already sanitized two functions up.
- **Human reviewers** are inconsistent — security expertise is rare, and reviewers under deadline pressure rubber-stamp PRs.
- **General-purpose AI reviewers** (Copilot review, generic GPT bots) try to do everything and end up doing nothing well.

AdaL changes this equation. As a code-aware agent, it can:

- Read the diff *and* the surrounding files
- Trace data flow across modules
- Reason about *why* something is dangerous, not just match a pattern
- Cite OWASP and suggest concrete fixes

SecReviewer wraps that capability into a 30-second install.

---

## 3. The Product

### What you ship
- A GitHub Action (`.github/workflows/sec-review.yml`)
- A landing page with one-click copy install
- Six demo files that prove the reviewer works (5 vulnerable + 1 safe baseline)

### What the user does
1. Paste one YAML file
2. Add `ANTHROPIC_API_KEY` to repo secrets
3. Open a PR

### What they get
A structured PR comment grouped by severity (Critical / Warnings / Suggestions), with file:line references, fix suggestions, and OWASP links — every time, on every PR.

---

## 4. The Bigger Vision: AdaL Expert Pack

SecReviewer is the **first** of a family. The same delivery pattern (Action + landing page + curated prompt) generalizes:

| Pack member            | Catches                                                          | Status      |
| ---------------------- | ---------------------------------------------------------------- | ----------- |
| **SecReviewer**        | SQLi, XSS, secrets, command injection, path traversal, crypto    | ✅ Shipped  |
| **PerfReviewer**       | N+1 queries, sync calls in async code, slow regex, memory leaks  | 🔜 Next     |
| **StyleReviewer**      | Naming, dead code, codebase-consistent patterns                  | 🔜 Next     |
| **InterviewReviewer**  | LeetCode-style review for candidates / students                  | 💭 Concept  |
| **SecReviewer Hub**    | Org-wide dashboard, severity trends, repo-by-repo report cards   | 💭 Concept  |

Other obvious adjacents: CI/CD auto-fix (lint, format), classroom assignment grading, legacy-codebase onboarding ("explain this module to me"). All share the same DNA: a focused prompt, a packaging surface, a clear ROI story.

---

## 5. AdaL — What I Loved, Where I Got Stuck

### Loved
- **CLI-first** is the right call. `adal -q "..."` composes with `cat`, `xargs`, and shell pipelines naturally — that's why the GitHub Action is 40 lines instead of 400.
- **`--yolo`** for non-interactive mode is exactly what CI needs.
- **Output as Markdown by default** plays beautifully with PR comments via `actions/github-script`.
- The agent's reasoning quality on real diffs felt closer to a human reviewer than to a linter.

### Got stuck
- Discovering install path took longer than it should — landing in `npm-global` under a virtualenv directory was unexpected. A clearer "you are here" hint on first run would help.
- I wasn't sure how to constrain output length / tokens for a CI context where I want bounded cost per PR. A `--max-tokens` flag or budget hint would be useful.
- Streaming mode in CI is unclear — for a long diff, does the agent stream to stdout or buffer? I worked around this with `> review.md`.

### Suggestions
- Ship a first-party `actions/adal-action@v1` so users don't `npm install -g` on every CI run (caching).
- A `adal review --diff <file>` subcommand would let SecReviewer skip the prompt-engineering boilerplate.
- Templates: `adal init action --type security` would scaffold something like SecReviewer in one command — and double as a DevRel funnel.

---

## 6. Why DevRel, Why Me

DevRel sits at the intersection of three loops: **product → docs → community → product**. The job isn't writing tutorials; it's noticing where developers fall off the install path, building the missing example, and feeding that signal back to the product team.

This weekend I lived all three. I installed AdaL, hit friction, built a vertical that papers over the friction, and wrote it up so the next person doesn't hit the same wall. SecReviewer is the kind of artifact a DevRel ships in week one — concrete, copy-pasteable, opinionated. I'd rather show you that than tell you about it.

---

*Repo: [github.com/.../sec-reviewer](#) · Live demo: [sec-reviewer.vercel.app](#)*
