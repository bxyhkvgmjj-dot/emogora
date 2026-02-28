// app/page.tsx
import Link from "next/link";
import Image from "next/image";

const SPACES = [
  {
    id: "feel",
    title: "Feel & Reflect",
    tagline: "Gentle emotional support, self-reflection, and inner calm.",
    colorGlow: "from-rose-300 via-pink-300 to-violet-300",
    chip: "Emotional Space",
    emoji: "💜",
  },
  {
    id: "plan",
    title: "Plan & Execute",
    tagline:
      "Improve daily discipline, productivity, and execution with guided planning.",
    colorGlow: "from-emerald-300 via-teal-300 to-sky-300",
    chip: "Action Space",
    emoji: "📅",
  },
  {
    id: "grow",
    title: "Grow My Career & Biz",
    tagline:
      "Boost your professional life, business clarity, communication, and confidence.",
    colorGlow: "from-fuchsia-300 via-violet-300 to-indigo-300",
    chip: "Growth Space",
    emoji: "🚀",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fdf7ff] text-slate-900 flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* Soft pastel background + extra beige / cream glow */}
      <div className="pointer-events-none fixed inset-0 opacity-90 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.20),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.16),_transparent_55%),radial-gradient(circle_at_0%_100%,rgba(248,239,223,0.85),_transparent_55%)]" />

      {/* Extra floating blobs for “alive” feeling */}
      <div className="pointer-events-none fixed -top-24 -left-24 h-[360px] w-[360px] rounded-full bg-fuchsia-200/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none fixed top-10 -right-24 h-[440px] w-[440px] rounded-full bg-violet-200/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none fixed -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full bg-sky-200/20 blur-3xl animate-pulse" />

      <div className="relative z-10 w-full max-w-5xl space-y-10">
        {/* BRAND HEADER */}
        <header className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          {/* Logo + wordmark section */}
          <div className="flex items-start gap-4">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
              <Image
                src="/emogora-logo.svg"
                alt="Emogora logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center flex-wrap gap-2">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  Emogora
                </h1>
                <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                  Premium Companion
                </span>
              </div>

              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-md">
                An AI life companion for your heart, your mind, and your ambitions —
                gentle, grounded and a little bit magical.
              </p>
            </div>
          </div>

          {/* Positioning / trust block */}
          <div className="flex flex-col items-center sm:items-end gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200 px-3 py-1 shadow-sm shadow-pink-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live, personalised guidance • 3 emotional modes
            </span>
            <span className="text-[11px] text-slate-500">
              Crafted for people who care about how they feel and who they are becoming.
            </span>
          </div>
        </header>

        {/* HERO TEXT */}
        <section className="text-center space-y-3">
          <h2 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900">
            Choose the space that matches your mood today
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Emogora gently changes tone, depth and style in each space. You can always
            come back here and pick a different energy whenever you need it.
          </p>
        </section>

        {/* SPACES GRID */}
        <section className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {SPACES.map((space) => (
            <Link
              key={space.id}
              href={`/chat?mode=${space.id}`}
              className="group relative rounded-[30px] bg-white/92 backdrop-blur-xl border border-slate-100 shadow-[0_16px_40px_rgba(148,163,184,0.30)] overflow-hidden transition duration-300 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(148,163,184,0.38)] focus-visible:outline-none"
            >
              {/* Animated gradient “ring” glow */}
              <div className="pointer-events-none absolute -inset-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div
                  className={`absolute inset-0 rounded-[32px] bg-gradient-to-br ${space.colorGlow} blur-xl`}
                />
              </div>

              {/* Shine sweep */}
              <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-white/20 rotate-12 opacity-0 group-hover:opacity-100 group-hover:translate-x-[220%] transition duration-700" />

              <div className="relative h-full flex flex-col gap-3 px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50/95 border border-slate-200 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600 transition group-hover:bg-white group-hover:border-fuchsia-200">
                    <span className="text-lg">{space.emoji}</span>
                    {space.chip}
                  </span>

                  {/* CTA pill instead of plain text */}
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition group-hover:bg-white group-hover:border-fuchsia-200">
                    Enter space
                    <span className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                  {space.title}
                  <span className="ml-2 inline-block opacity-0 group-hover:opacity-100 transition">
                    ✨
                  </span>
                </h3>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {space.tagline}
                </p>

                {/* “Game-like” micro reward strip */}
                <div className="mt-auto pt-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-[11px] text-slate-600 shadow-sm transition group-hover:bg-white">
                    Emogora adjusts its personality, pacing and guidance just for this space.
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* FOOTER NOTE */}
        <p className="mt-4 text-[11px] text-center text-slate-500">
          This early version keeps your conversations in this browser. Emogora is growing into a safe,
          premium place for your feelings, focus and future.
        </p>
      </div>
    </main>
  );
}
