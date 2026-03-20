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

        setNotice("Account created. Check your email to confirm your address.");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_30%),linear-gradient(to_bottom_right,_#fafafa,_#f4f4f5,_#f8fafc)] text-zinc-900">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-[-80px] top-[-80px] h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
            <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500" />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-900">Momentum</p>
                <p className="text-xs text-zinc-500">Habits + tasks</p>
              </div>
            </div>

            <div className="mt-10 max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-700">
                Momentum access
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-zinc-900">
                Build consistency with a system that feels calm, clear, and powerful.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
                Momentum helps turn scattered effort into visible progress through
                focused habits, structured tasks, and daily rhythm.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
              <FeatureCard
                title="Daily clarity"
                text="See what matters now and remove friction from your next move."
              />
              <FeatureCard
                title="Visible progress"
                text="Track wins, consistency, and momentum in a way that feels rewarding."
              />
              <FeatureCard
                title="Soft performance"
                text="Stay productive without the harsh, cluttered feel of typical tools."
              />
              <FeatureCard
                title="One clean workspace"
                text="Habits, tasks, calendar, and focus all connected in one flow."
              />
            </div>
          </div>

          <div className="relative z-10 mt-12">
            <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
              <MiniStat label="Focus" value="Clear next step" />
              <MiniStat label="Rhythm" value="Daily consistency" />
              <MiniStat label="Energy" value="Less mental clutter" />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md">
            <div className="rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 shadow-sm">
                  Momentum
                </div>

                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {mode === "signin"
                    ? "Log in to access your Momentum dashboard and continue your rhythm."
                    : "Create your Momentum access and start building stronger consistency."}
                </p>
              </div>

              <div className="mb-6 rounded-2xl bg-zinc-100 p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setNotice(null);
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      mode === "signin"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900"
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
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      mode === "signup"
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    Sign up
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-200/60 transition hover:scale-[0.99] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  Continue with magic link
                </button>

                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-900 hover:underline disabled:opacity-60"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="mt-8 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500">
                Looking for Emogora instead?{" "}
                <Link href="/login" className="font-medium text-zinc-900 hover:underline">
                  Go to Emogora login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-5 shadow-sm backdrop-blur">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/65 px-4 py-4 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}