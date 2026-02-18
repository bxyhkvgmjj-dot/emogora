"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const updatePassword = async () => {
    setError(null);

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setDone(true);
      setTimeout(() => (window.location.href = "/login"), 900);
    } catch (e: any) {
      setError(e?.message ?? "Could not update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#fdf7ff]">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Reset password</h1>

        {done ? (
          <p className="mt-3 text-slate-700">Password updated. Redirecting…</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              Choose a new password for your Emogora account.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="block text-[11px] uppercase tracking-wide text-slate-500">
                New password
              </label>
              <input
                type="password"
                className="mt-1 w-full bg-transparent text-sm text-slate-900 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <button
              onClick={updatePassword}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
