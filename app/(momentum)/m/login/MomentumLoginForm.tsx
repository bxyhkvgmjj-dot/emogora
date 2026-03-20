"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Props = {
  initialMode?: "signin" | "signup";
  initialMessage?: string | null;
};

export default function MomentumLoginForm({
  initialMode = "signin",
  initialMessage = null,
}: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialMessage);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=/m`,
          },
        });

        if (error) {
          setError(error.message);
          return;
        }

        setNotice(
          "Account created. Check your email to confirm your address."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }

        window.location.href = "/m";
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setError(null);
    setNotice(null);

    if (!email) {
      setError("Enter your email first.");
      return;
    }

    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/m`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setNotice("Magic link sent. Check your email.");
    } catch {
      setError("Unable to send magic link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setNotice(null);

    if (!email) {
      setError("Enter your email first to reset your password.");
      return;
    }

    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setNotice("Password reset email sent.");
    } catch {
      setError("Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between border-r border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 p-10">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
              Momentum
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight">
              Build consistency.
              <br />
              Track habits, tasks, and progress with focus.
            </h1>

            <p className="mt-4 max-w-lg text-base text-white/65">
              Momentum is your execution space — designed to help you stay on
              track, stack wins, and keep moving forward.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/80">
                Stay aligned with your priorities every day.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/80">
                One account. Clear access. Product-specific experience.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-300/80">
                Momentum
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                {mode === "signin"
                  ? "Log in to access your Momentum dashboard."
                  : "Create your Momentum access and start building consistency."}
              </p>
            </div>

            <div className="mb-6 flex rounded-2xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm transition ${
                  mode === "signin"
                    ? "bg-white text-neutral-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2 text-sm transition ${
                  mode === "signup"
                    ? "bg-white text-neutral-900"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/75">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/40"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/75">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/40"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {notice && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-medium text-neutral-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Sign in to Momentum"
                  : "Create Momentum account"}
              </button>
            </form>

            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/85 transition hover:bg-white/5 disabled:opacity-60"
              >
                Continue with magic link
              </button>

              {mode === "signin" && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="w-full text-sm text-white/60 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-60"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-white/50">
              Looking for Emogora instead?{" "}
              <Link href="/login" className="text-white hover:underline">
                Go to Emogora login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}