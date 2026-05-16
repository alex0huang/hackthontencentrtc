import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken, getToken } from "../api.js";

function severityBadge(sev) {
  switch (sev) {
    case "critical":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    case "warning":
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case "suggestion":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    default:
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  }
}

function FindingItem({ item, color }) {
  return (
    <li className="flex flex-col gap-0.5 py-1.5">
      {item.file && (
        <code className="text-xs text-pink-300">
          {item.file}
          {item.line ? `:${item.line}` : ""}
        </code>
      )}
      <span className={`text-sm ${color}`}>{item.message}</span>
    </li>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("findings");
  const [findings, setFindings] = useState(null);
  const [repos, setRepos] = useState(null);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!getToken()) {
      nav("/");
      return;
    }
    api("/me").then(setMe).catch(() => nav("/"));
    refreshFindings();
  }, []);

  async function refreshFindings() {
    setLoadingFindings(true);
    setError("");
    try {
      setFindings(await api("/findings"));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingFindings(false);
    }
  }
  async function refreshRepos() {
    setLoadingRepos(true);
    setError("");
    try {
      setRepos(await api("/repos"));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoadingRepos(false);
    }
  }

  async function logout() {
    try {
      await api("/logout", { method: "POST" });
    } catch {}
    setToken(null);
    nav("/");
  }

  const filteredItems = useMemo(() => {
    if (!findings?.items) return [];
    if (filter === "all") return findings.items;
    return findings.items.filter((f) => f.severity === filter);
  }, [findings, filter]);

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 z-10 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg">🛡️ SecReviewer</div>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 text-sm">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {me.avatar && (
            <img src={me.avatar} className="w-8 h-8 rounded-full" alt="" />
          )}
          <div className="text-sm">
            <div className="font-medium text-slate-200">
              {me.name || me.login}
            </div>
            <div className="text-xs text-slate-500">@{me.login}</div>
          </div>
          <button
            onClick={logout}
            className="ml-3 text-sm text-slate-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Summary */}
        {findings && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="Total reviews"
              value={findings.count}
              accent="text-slate-100"
            />
            <SummaryCard
              label="Critical"
              value={findings.total_critical}
              accent="text-red-300"
            />
            <SummaryCard
              label="Warnings"
              value={findings.total_warnings}
              accent="text-amber-300"
            />
            <SummaryCard
              label="Suggestions"
              value={findings.total_suggestions}
              accent="text-blue-300"
            />
          </section>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          {[
            { id: "findings", label: "Findings" },
            { id: "repos", label: "Repositories" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === "repos" && !repos) refreshRepos();
              }}
              className={`px-4 py-2 text-sm border-b-2 transition ${
                tab === t.id
                  ? "border-emerald-400 text-white"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={tab === "findings" ? refreshFindings : refreshRepos}
            className="ml-auto text-sm text-slate-400 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {tab === "findings" && (
          <FindingsTab
            findings={findings}
            loading={loadingFindings}
            filter={filter}
            setFilter={setFilter}
            items={filteredItems}
          />
        )}

        {tab === "repos" && (
          <ReposTab repos={repos} loading={loadingRepos} />
        )}
      </main>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-bold ${accent}`}>{value ?? "—"}</div>
    </div>
  );
}

function FindingsTab({ findings, loading, filter, setFilter, items }) {
  if (loading && !findings) {
    return <div className="text-slate-400 text-sm">Scanning your GitHub PRs…</div>;
  }
  if (!findings) return null;
  if (findings.count === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
        <div className="text-5xl mb-3">🌱</div>
        <div className="text-lg font-semibold mb-1">No SecReviewer reports yet</div>
        <p className="text-slate-400 max-w-md mx-auto text-sm">
          Install the SecReviewer workflow on one of your repos and open a PR.
          When the bot comments, the report will show up here automatically.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `All (${findings.count})` },
          { id: "critical", label: `Critical (${findings.total_critical ? items.filter(i => i.severity === "critical").length : 0})` },
          { id: "warning", label: `Warnings` },
          { id: "suggestion", label: `Suggestions` },
          { id: "clean", label: `Clean` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${
              filter === f.id
                ? "bg-slate-100 text-slate-950 border-slate-100"
                : "border-slate-700 text-slate-300 hover:border-slate-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-slate-500 text-sm">No items match this filter.</div>
        )}
        {items.map((f, idx) => (
          <FindingCard key={`${f.repo}-${f.kind}-${f.ref_number}-${idx}`} f={f} />
        ))}
      </div>
    </section>
  );
}

function FindingCard({ f }) {
  const [open, setOpen] = useState(false);
  const counts = {
    critical: f.critical?.length || 0,
    warnings: f.warnings?.length || 0,
    suggestions: f.suggestions?.length || 0,
  };
  const refLabel =
    f.kind === "commit" ? f.ref_number : `PR #${f.ref_number}`;

  return (
    <div className={`rounded-xl border p-4 ${severityBadge(f.severity).replace("text-", "").replace("bg-", "border-").split(" ")[0]} bg-slate-900/60`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider text-[10px]">
              {f.kind === "commit" ? "push" : "pr"}
            </span>
            <span className="font-mono">{f.repo}</span>
            <span>·</span>
            <a
              href={f.ref_url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 hover:text-emerald-200 font-mono"
            >
              {refLabel}
            </a>
            <span>·</span>
            <span>{f.created_at ? new Date(f.created_at).toLocaleString() : ""}</span>
          </div>
          <div className="font-medium text-slate-100 truncate">
            {f.ref_title || (f.kind === "commit" ? "Commit review" : "Untitled PR")}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {f.verdict === "PASS" && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-semibold">
              ✅ PASS
            </span>
          )}
          {f.verdict === "BLOCK" && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/20 text-red-200 font-semibold">
              ❌ BLOCK
            </span>
          )}
          {counts.critical > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-300">
              🔴 {counts.critical}
            </span>
          )}
          {counts.warnings > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300">
              🟠 {counts.warnings}
            </span>
          )}
          {counts.suggestions > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-500/15 text-blue-300">
              💡 {counts.suggestions}
            </span>
          )}
          {f.severity === "clean" && !f.verdict && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
              ✓ clean
            </span>
          )}
          {f.human_review_needed === true && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/20 text-red-200 font-semibold">
              👀 Review needed
            </span>
          )}
        </div>
      </div>

      {(counts.critical + counts.warnings + counts.suggestions) > 0 && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-3 text-xs text-slate-400 hover:text-slate-200"
        >
          {open ? "▾ Hide details" : "▸ View findings"}
        </button>
      )}

      {open && (
        <div className="mt-4 grid md:grid-cols-3 gap-4 border-t border-slate-800 pt-4">
          {f.critical?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-300 mb-2">
                🔴 Critical
              </div>
              <ul className="space-y-2">
                {f.critical.map((c, i) => (
                  <FindingItem key={i} item={c} color="text-slate-200" />
                ))}
              </ul>
            </div>
          )}
          {f.warnings?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-300 mb-2">
                🟠 Warnings
              </div>
              <ul className="space-y-2">
                {f.warnings.map((c, i) => (
                  <FindingItem key={i} item={c} color="text-slate-200" />
                ))}
              </ul>
            </div>
          )}
          {f.suggestions?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-blue-300 mb-2">
                💡 Suggestions
              </div>
              <ul className="space-y-2">
                {f.suggestions.map((c, i) => (
                  <FindingItem key={i} item={c} color="text-slate-200" />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReposTab({ repos, loading }) {
  if (loading && !repos) {
    return <div className="text-slate-400 text-sm">Loading your repos…</div>;
  }
  if (!repos) return null;
  if (repos.length === 0) {
    return <div className="text-slate-500 text-sm">No repositories.</div>;
  }
  return (
    <section className="grid md:grid-cols-2 gap-3">
      {repos.map((r) => (
        <div
          key={r.full_name}
          className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 flex items-start justify-between gap-3"
        >
          <div className="min-w-0">
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-slate-100 hover:text-emerald-300 truncate block"
            >
              {r.full_name}
            </a>
            <div className="text-xs text-slate-500 mt-1">
              {r.private ? "private" : "public"} · {r.default_branch}
              {r.pushed_at && (
                <> · pushed {new Date(r.pushed_at).toLocaleDateString()}</>
              )}
            </div>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${
              r.sec_reviewer_installed
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "border-slate-700 text-slate-400"
            }`}
          >
            {r.sec_reviewer_installed ? "✓ installed" : "not installed"}
          </span>
        </div>
      ))}
    </section>
  );
}
