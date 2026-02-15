// app/login/LoginForm.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = {
  initialMode?: "signin" | "signup";
};

export default function LoginForm({ initialMode = "signin" }: Props) {
  // ✅ avoid re-creating the client on every render
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // ✅ Default is signin so /login = "Welcome back"
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  // ✅ Support redirecting back to original page (middleware sets ?next=...)
  const nextUrl = params.get("next") || "/chat?mode=feel";

  useEffect(() => {
    setMounted(true);

    // ✅ mode can still be forced by URL: /login?mode=signin
    // (signup is gated on the server now)
    const m = params.get("mode");
    if (m === "signin") setMode("signin");

    // ✅ optional prefill: /login?email=...
    const e = params.get("email");
    if (e) setEmail(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToApp = () => {
    window.location.href = nextUrl;
  };

  const submit = async () => {
    if (loading) return;

    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter email and password.");
        return;
      }

      if (mode === "signup") {
        // ✅ Signup allowed ONLY if server rendered this page in signup mode
        // (no key check needed here anymore)
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        goToApp();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      goToApp();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "signin" ? "Welcome back" : "Create your account";
  const subtitle =
    mode === "signin"
      ? "Pick up your emotional journey where you left off."
      : "Your space is ready. Create your account to save conversations and progress.";

  return (
    <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-10 bg-[#fdf7ff] overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 opacity-95 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.16),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_0%_100%,rgba(248,239,223,0.9),_transparent_55%)]" />

      {/* Soft floating blobs */}
      <div className="pointer-events-none fixed -top-24 -left-24 h-[340px] w-[340px] rounded-full bg-fuchsia-200/35 blur-3xl animate-pulse" />
      <div className="pointer-events-none fixed top-10 -right-24 h-[420px] w-[420px] rounded-full bg-violet-200/35 blur-3xl animate-pulse" />
      <div className="pointer-events-none fixed -bottom-28 left-1/3 h-[480px] w-[480px] rounded-full bg-sky-200/25 blur-3xl animate-pulse" />

      <div
        className={[
          "relative z-10 w-full max-w-md rounded-[34px] bg-white/90 backdrop-blur-xl border border-slate-100",
          "shadow-[0_22px_60px_rgba(148,163,184,0.35)] overflow-hidden",
          "transition duration-700 ease-out",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        ].join(" ")}
      >
        <div className="absolute inset-x-0 -top-20 h-40 bg-gradient-to-r from-fuchsia-300/30 via-rose-200/25 to-violet-300/30 blur-2xl" />

        {/* Header */}
        <div className="relative p-6 sm:p-7 border-b border-slate-100 bg-gradient-to-r from-white/90 via-white to-rose-50/70">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 border border-slate-200 shadow-sm">
            <span className="relative h-5 w-5">
              <Image
                src="/emogora-logo.svg"
                alt="Emogora logo"
                fill
                className="object-contain"
                priority
              />
            </span>
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-700">
              Emogora
            </span>
            <span className="ml-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700">
              Premium companion
            </span>
          </div>

          <h1 className="mt-4 text-2xl sm:text-[28px] font-semibold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-fuchsia-600 via-violet-600 to-rose-600 bg-clip-text text-transparent">
              {title}
            </span>
          </h1>

          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {subtitle}
          </p>

          {mode === "signup" && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-center shadow-sm">
                ✨ Save chats
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-center shadow-sm">
                🧠 Track progress
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-center shadow-sm">
                🔒 Private space
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="relative p-6 sm:p-7 space-y-3">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {notice}
            </div>
          )}

          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-fuchsia-200/70 transition">
            <label className="block text-[11px] uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              className="mt-1 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 px-4 py-3 shadow-inner focus-within:ring-2 focus-within:ring-fuchsia-200/70 transition">
            <label className="block text-[11px] uppercase tracking-wide text-slate-500">
              Password
            </label>
            <input
              type="password"
              className="mt-1 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={loading}
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className={[
              "w-full inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition",
              "shadow-[0_18px_40px_rgba(217,70,239,0.28)]",
              loading
                ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:from-fuchsia-400 hover:to-violet-400 active:scale-[0.99]",
            ].join(" ")}
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {/* Bottom CTA */}
          <button
            onClick={() => {
              setError(null);
              setNotice(null);
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="w-full"
            type="button"
          >
            <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm">
              {mode === "signin" ? (
                <>
                  <span className="text-[15px]">✨</span>
                  <span>No account?</span>
                  <span className="text-slate-900 font-semibold underline decoration-fuchsia-300 underline-offset-4">
                    Create one
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[15px]">↩︎</span>
                  <span>Already have an account?</span>
                  <span className="text-slate-900 font-semibold underline decoration-fuchsia-300 underline-offset-4">
                    Sign in
                  </span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
