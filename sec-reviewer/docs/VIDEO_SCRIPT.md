# SecReviewer Demo Video — Script (3–4 min)

**Audience:** SylphAI team (DevRel hire) · **Tone:** technical, conversational, light on sales

---

## Open (0:00 – 0:20) — Hook

> "Last year, GitHub found that 17% of public repos leak at least one secret. Static scanners catch the obvious ones. Human reviewers miss the rest. So I spent a weekend building **SecReviewer** — a GitHub Action that puts an AI security engineer on every pull request. It's powered by AdaL, and it installs in 30 seconds. Let me show you."

**Screen:** Title card → quick cut to a real PR comment with red "🔴 Critical" findings.

---

## Act 1 — The Problem (0:20 – 0:50)

> "Here's a PR I opened with a tiny SQL injection bug." *(show diff)* "Semgrep flags `f-string in execute()` — fine. But it can't tell me **why** it's exploitable, what payload would break it, or how to fix it without breaking the test suite. That's the gap SecReviewer fills."

**Screen:**
- Split: Semgrep output (terse) vs. SecReviewer comment (explanation + fix + OWASP link)
- Highlight the difference visually

---

## Act 2 — The Install (0:50 – 1:40)

> "The whole product is one YAML file. Watch."

**Screen recording:**
1. Open landing page (sec-reviewer.vercel.app)
2. Click **Copy** on the install block — show "✓ Copied!" feedback
3. Paste into `.github/workflows/sec-review.yml`
4. GitHub UI: Settings → Secrets → add `ADAL_API_KEY`
5. Open a PR with the vulnerable `examples/sql-injection.py`
6. Watch the Actions tab → Workflow runs → Comment appears

> "Three steps. No SDK. No config file. The whole thing is a wrapper around `adal -q`. That's the AdaL CLI doing the heavy lifting."

---

## Act 3 — Under the Hood (1:40 – 2:30)

**Screen:** Show the workflow YAML, highlighting the `adal -q "..."` block.

> "The Action does three things: pulls the diff, pipes it into AdaL with a security-focused prompt, and posts the markdown back as a PR comment. The reviewer prompt is opinionated — it groups findings by severity, asks for OWASP links, and decides whether human review is needed. Because AdaL is *agentic*, not just a model call, it can read surrounding files when it needs more context — that's how it tells the difference between a real SQLi and one where the input is already sanitized upstream."

**Screen:** Briefly show `examples/safe-code.py` getting "✅ No security issues detected."

---

## Act 4 — The Bigger Picture (2:30 – 3:15)

> "SecReviewer isn't really one product — it's a **template**. The same delivery pattern works for performance review, style review, accessibility review. I'm calling it the **AdaL Expert Pack**."

**Screen:** Animated grid:
- ✅ SecReviewer (shipped)
- 🔜 PerfReviewer (N+1, slow regex)
- 🔜 StyleReviewer (codebase-aware)
- 💭 SecReviewer Hub (org dashboard)

> "Each one is the same recipe: a sharp prompt, a 40-line Action, a one-page landing site. AdaL provides the brain. The Expert Pack provides the surface area developers actually install."

---

## Close (3:15 – 3:45) — Hook back

> "I built this in a weekend because AdaL made it possible. I'd love to build the rest of the Pack at SylphAI — and the docs, the templates, and the community around it. The repo, the landing page, and a written use-case brief are linked below. Thanks for watching."

**Screen:** End card with three links: GitHub repo · Live site · Use-case doc · Email.

---

## 🎬 Shot list (record in this order)

| # | Type        | What                                                        | Tool         |
|---|-------------|-------------------------------------------------------------|--------------|
| 1 | Screencast  | Landing page → Copy button → Paste in editor                | OBS / Loom   |
| 2 | Screencast  | GitHub Settings → Secrets → add key                         | Loom         |
| 3 | Screencast  | `git push` → Actions tab → workflow run → PR comment appears| Loom         |
| 4 | Voiceover   | Workflow YAML walkthrough (zoom into `adal -q` block)       | Editor + VO  |
| 5 | Animation   | Expert Pack grid reveal                                     | Keynote/Figma|
| 6 | Talking head| Open and close (optional, but adds personality)             | Webcam       |

## 🎤 Tips

- **Pace:** Cut every >5s shot. CI loading screens → 2x speed.
- **Captions:** Burn them in. Half your audience watches muted.
- **Zoom in** on the YAML and PR comment — the YAML is the hero shot.
- **One CTA at the end:** "I'd love to chat" — links to your contact.
