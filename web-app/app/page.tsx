'use client';

import { useState } from 'react';

const ONE_CLICK_INSTALL = `curl -fsSL https://raw.githubusercontent.com/alex0huang/hackthonadal/main/install.sh | bash`;

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

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [copiedOneClick, setCopiedOneClick] = useState(false);

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

  const scrollToInstall = () => {
    document.getElementById('install')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Hero */}
      <section className="px-6 pt-24 pb-20 text-center max-w-5xl mx-auto">
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
          Powered by <span className="text-emerald-300 font-semibold">AdaL</span> agent · Catches injections, hardcoded secrets, and security flaws before they ship
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={scrollToInstall}
            className="px-8 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition shadow-lg shadow-emerald-500/20"
          >
            Get Started →
          </button>
          <a
            href="https://github.com/alex0huang/hackthonadal"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-3.5 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-slate-100 font-semibold transition"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-14">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📋', title: 'Add to your repo', desc: 'Copy our workflow file into .github/workflows/' },
            { icon: '🔑', title: 'Set your API key', desc: 'Add ADAL_API_KEY to repo secrets' },
            { icon: '✅', title: 'Open a PR', desc: 'SecReviewer comments on every pull request automatically' },
          ].map((step, i) => (
            <div key={i} className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-emerald-500/40 transition">
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="text-sm font-semibold text-emerald-300 mb-2">STEP {i + 1}</div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install */}
      <section id="install" className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">One-click install</h2>
        <p className="text-center text-slate-400 mb-10">Copy, paste, ship. No SDK, no config.</p>

        {/* One-line installer */}
        <div className="mb-10">
          <p className="text-center text-emerald-300 text-sm font-semibold mb-3 uppercase tracking-wider">⚡ Fastest: pre-push security guard</p>
          <p className="text-center text-slate-400 text-sm mb-4">Run this inside any git repo — installs a pre-push hook that reviews every push.</p>
          <div className="relative rounded-xl bg-slate-950 border border-emerald-500/40 overflow-hidden shadow-lg shadow-emerald-500/10">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700">
              <span className="text-xs text-slate-500 font-mono">Terminal</span>
              <button
                onClick={handleCopyOneClick}
                className="px-3 py-1 text-xs rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition"
              >
                {copiedOneClick ? '✓ Copied!' : 'Copy'}
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
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="p-5 text-sm overflow-x-auto text-slate-300 font-mono leading-relaxed max-h-[420px]">
            <code>{INSTALL_YAML}</code>
          </pre>
        </div>

        <ol className="mt-8 space-y-3 text-slate-300">
          <li><span className="text-emerald-400 font-mono">1.</span> Create <code className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 text-sm">.github/workflows/sec-review.yml</code> and paste the YAML above.</li>
          <li><span className="text-emerald-400 font-mono">2.</span> Go to <strong>Settings → Secrets → Actions</strong> and add <code className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 text-sm">ADAL_API_KEY</code> (<a className="text-emerald-300 underline" href="https://adal.sylph.ai/" target="_blank" rel="noreferrer">get one here</a>).</li>
          <li><span className="text-emerald-400 font-mono">3.</span> Open a PR. Done.</li>
        </ol>
      </section>

      {/* Live Demo */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">What you&apos;ll get</h2>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
          <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-bold text-slate-950">S</div>
            <div>
              <div className="font-semibold text-slate-100">github-actions <span className="text-slate-500 font-normal">commented just now</span></div>
              <div className="text-xs text-slate-500">on PR #42 · Add user login endpoint</div>
            </div>
          </div>
          <div className="p-6 space-y-4 text-sm leading-relaxed">
            <h3 className="text-lg font-bold">🛡️ SecReviewer Report</h3>
            <div>
              <div className="font-semibold text-red-400 mb-1">🔴 Critical Issues</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><code className="text-pink-300">src/auth.py:23</code> — SQL injection: user input concatenated into query. Use parameterized queries.</li>
                <li><code className="text-pink-300">src/config.js:8</code> — Hardcoded Stripe API key (<code className="text-slate-400">sk_live_...</code>). Move to env var immediately.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-amber-400 mb-1">🟠 Warnings</div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li><code className="text-pink-300">src/upload.py:45</code> — Path traversal possible; validate filename against base dir.</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-blue-300 mb-1">👀 Human Review Needed?</div>
              <p className="text-slate-300">YES — credential leak and SQLi must be fixed before merge.</p>
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">Powered by AdaL · SecReviewer</div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">What&apos;s next</h2>
        <p className="text-center text-slate-400 mb-12">The AdaL Expert Pack — a family of specialized reviewers.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '⚡', title: 'PerfReviewer', desc: 'Catch N+1 queries, slow regex, memory leaks' },
            { icon: '🎨', title: 'StyleReviewer', desc: 'Codebase-aware style + naming consistency' },
            { icon: '📊', title: 'SecReviewer Hub', desc: 'Org-wide dashboard, trends, severity reports' },
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-800/30 border border-dashed border-slate-700">
              <div className="text-4xl mb-3 opacity-70">{item.icon}</div>
              <h3 className="text-lg font-bold mb-1">{item.title}</h3>
              <div className="text-xs text-slate-500 mb-2 font-mono">coming soon</div>
              <p className="text-slate-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-slate-800 mt-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div>Built at SylphAI Hackathon · Powered by AdaL · MIT License</div>
          <div className="flex gap-6">
            <a href="https://github.com/alex0huang/hackthonadal" target="_blank" rel="noreferrer" className="hover:text-emerald-300 transition">GitHub</a>
            <a href="https://adalagent.ai" className="hover:text-emerald-300 transition">AdaL</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
