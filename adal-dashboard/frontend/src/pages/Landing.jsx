import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, loginWithGitHub } from "../api.js";

const ONE_CLICK_INSTALL = `curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthontencentrtc/main/install.sh | bash`;

const INSTALL_YAML = `name: SecReviewer

on:
  pull_request:
    branches: [main, master]

jobs:
  security-review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g @sylphai/adal-cli
      - name: Run SecReviewer
        env:
          ADAL_API_KEY: \${{ secrets.ADAL_API_KEY }}
        run: |
          git diff origin/\${{ github.base_ref }}...HEAD > pr.diff
          [ -s pr.diff ] || exit 0
          cat pr.diff | adal -q "Senior security engineer reviewing this diff. \\
            Find: SQL/XSS/command injection, path traversal, hardcoded secrets, \\
            auth flaws, crypto weaknesses. Output Markdown with Critical Issues, \\
            Warnings, Suggestions, Human Review Needed (YES/NO), Learn More." \\
            --yolo > review.md
      - uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.existsSync('review.md')
              ? fs.readFileSync('review.md', 'utf8') : '_No review._';
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: \`# 🛡️ SecReviewer Report\\n\\n\${review}\\n\\n---\\n_Powered by AdaL_\`
            });
`;

function parseRepo(input) {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const urlMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  return null;
}

export default function Landing() {
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedOneClick, setCopiedOneClick] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [installError, setInstallError] = useState("");
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (getToken()) nav("/dashboard", { replace: true });
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(INSTALL_YAML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleCopyOneClick = async () => {
    await navigator.clipboard.writeText(ONE_CLICK_INSTALL);
    setCopiedOneClick(true);
    setTimeout(() => setCopiedOneClick(false), 2000);
  };

  const scrollToInstall = () =>
    document.getElementById("install")?.scrollIntoView({ behavior: "smooth" });

  const handleInstall = async () => {
    setInstallError("");
    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      setInstallError('Enter a repo as "owner/name" or a GitHub URL');
      return;
    }
    const popup = window.open("about:blank", "_blank");
    setInstalling(true);
    let branch = "main";
    try {
      const res = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`
      );
      if (res.ok) {
        const data = await res.json();
        branch = data.default_branch || "main";
        const branchRes = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches/${branch}`
        );
        if (branchRes.status === 404) {
          setInstallError(
            `Repo "${parsed.owner}/${parsed.repo}" has no "${branch}" branch yet. Push at least one commit, then try again.`
          );
          popup?.close();
          setInstalling(false);
          return;
        }
      } else if (res.status === 404) {
        setInstallError(
          `Repo not found: ${parsed.owner}/${parsed.repo}. Is it public?`
        );
        popup?.close();
        setInstalling(false);
        return;
      }
    } catch {
      /* fall through */
    }
    setInstalling(false);
    const url =
      `https://github.com/${parsed.owner}/${parsed.repo}/new/${branch}` +
      `?filename=${encodeURIComponent(".github/workflows/sec-review.yml")}` +
      `&value=${encodeURIComponent(INSTALL_YAML)}` +
      `&message=${encodeURIComponent("ci: add SecReviewer security review workflow")}` +
      `&description=${encodeURIComponent("Adds AI-powered security review on every PR via AdaL.")}`;
    if (popup) popup.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSecretsRedirect = () => {
    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      setInstallError("Enter your repo above first");
      return;
    }
    window.open(
      `https://github.com/${parsed.owner}/${parsed.repo}/settings/secrets/actions/new`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 z-10 bg-slate-950/80 backdrop-blur">
        <div className="font-bold text-lg">🛡️ SecReviewer</div>
        <button
          onClick={loginWithGitHub}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.9-.39.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          Sign in with GitHub
        </button>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center max-w-5xl mx-auto">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-medium">
          🛡️ AI Security Review for GitHub
        </div>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
          SecReviewer
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-4 font-medium">
          AI-powered security review for every Pull Request
        </p>
        <p className="text-base md:text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
          Powered by <span className="text-emerald-300 font-semibold">AdaL</span> · Catches injections, hardcoded secrets, and security flaws before they ship. Sign in to view every finding across your repos in one dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={loginWithGitHub}
            className="px-8 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            Sign in with GitHub →
          </button>
          <button
            onClick={scrollToInstall}
            className="px-8 py-3.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-100 font-semibold transition"
          >
            Install on a Repo
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "📋", title: "Install on your repo", desc: "Paste a repo name, click Install — GitHub opens the workflow pre-filled" },
            { icon: "🔑", title: "Set your API key", desc: "Add ADAL_API_KEY to repo secrets" },
            { icon: "📊", title: "Open PRs, see findings", desc: "SecReviewer comments on each PR; this dashboard aggregates them" },
          ].map((step, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 transition"
            >
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-sm font-semibold text-emerald-300 mb-2">
                STEP {i + 1}
              </div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install */}
      <section id="install" className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">One-click install</h2>
        <p className="text-center text-slate-400 mb-10">
          Paste your repo, click Install. GitHub opens with the workflow pre-filled — just commit.
        </p>

        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
          <label className="block text-sm font-semibold text-emerald-300 mb-2">
            🚀 Install to your repo
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                setInstallError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInstall();
              }}
              placeholder="owner/repo  or  https://github.com/owner/repo"
              className="flex-1 px-4 py-3 rounded-lg bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:outline-none text-slate-100 font-mono text-sm placeholder-slate-600"
            />
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-wait text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
            >
              {installing ? "Detecting branch…" : "Install on GitHub →"}
            </button>
          </div>
          {installError && (
            <p className="mt-3 text-sm text-red-400">{installError}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <span>After committing the workflow:</span>
            <button
              onClick={handleSecretsRedirect}
              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
            >
              → Add ADAL_API_KEY secret
            </button>
            <a
              href="https://adal.sylph.ai/"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-emerald-300"
            >
              (get a key)
            </a>
          </div>
        </div>

        <div className="text-center text-xs uppercase tracking-wider text-slate-500 mb-6">
          — or copy manually —
        </div>

        <div className="mb-10">
          <p className="text-center text-emerald-300 text-sm font-semibold mb-3 uppercase tracking-wider">
            ⚡ Fastest: pre-push security guard
          </p>
          <p className="text-center text-slate-400 text-sm mb-4">
            Run this inside any git repo — installs a pre-push hook that reviews every push.
          </p>
          <div className="relative rounded-xl bg-slate-950 border border-emerald-500/40 overflow-hidden shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
              <span className="text-xs text-slate-500 font-mono">Terminal</span>
              <button
                onClick={handleCopyOneClick}
                className="px-3 py-1 text-xs rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition"
              >
                {copiedOneClick ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <pre className="p-5 text-sm overflow-x-auto text-emerald-200 font-mono">
              <code>$ {ONE_CLICK_INSTALL}</code>
            </pre>
          </div>
        </div>

        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-500 text-sm">or use GitHub Actions</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <div className="relative rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-slate-500 font-mono">.github/workflows/sec-review.yml</span>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-sm overflow-x-auto text-slate-300 font-mono leading-relaxed max-h-[420px]">
            <code>{INSTALL_YAML}</code>
          </pre>
        </div>
      </section>

      {/* Dashboard tease */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          One dashboard for every PR
        </h2>
        <p className="text-center text-slate-400 mb-10">
          Sign in with GitHub to see every SecReviewer finding across your repos — critical issues, warnings, and suggestions, ranked and searchable.
        </p>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-slate-950">S</div>
            <div>
              <div className="font-semibold text-slate-100">
                github-actions <span className="text-slate-500 font-normal">commented just now</span>
              </div>
              <div className="text-xs text-slate-500">on PR #42 · Add user login endpoint</div>
            </div>
          </div>
          <div className="p-6 space-y-4 text-sm leading-relaxed">
            <h3 className="text-lg font-bold">🛡️ SecReviewer Report</h3>
            <div>
              <div className="font-semibold text-red-400 mb-1">🔴 Critical Issues</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>
                  <code className="text-pink-300">src/auth.py:23</code> — SQL injection: user input concatenated into query.
                </li>
                <li>
                  <code className="text-pink-300">src/config.js:8</code> — Hardcoded Stripe API key.
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-amber-400 mb-1">🟠 Warnings</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>
                  <code className="text-pink-300">src/upload.py:45</code> — Path traversal possible.
                </li>
              </ul>
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
              Powered by AdaL · SecReviewer
            </div>
          </div>
        </div>
        <div className="text-center mt-8">
          <button
            onClick={loginWithGitHub}
            className="px-8 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            Sign in with GitHub →
          </button>
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-slate-800 mt-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div>Built at SylphAI Hackathon · Powered by AdaL · MIT License</div>
          <div className="flex gap-6">
            <a
              href="https://github.com/alex0huang/hackthontencentrtc"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-300 transition"
            >
              GitHub
            </a>
            <a href="https://adalagent.ai" className="hover:text-emerald-300 transition">
              AdaL
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
