export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("adal_token");
}
export function setToken(t) {
  if (t) localStorage.setItem("adal_token", t);
  else localStorage.removeItem("adal_token");
}

export async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function loginWithGitHub() {
  window.location.href = `${API_BASE}/auth/github/start`;
}
