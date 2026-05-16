import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken } from "../api.js";

export default function AuthCallback() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      setToken(token);
      nav("/dashboard", { replace: true });
    } else {
      nav("/", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-slate-300">
      Signing you in…
    </div>
  );
}
