import Link from "next/link";

const nav = [
  { href: "/m", label: "Dashboard" },
  { href: "/m/habits", label: "Habits" },
  { href: "/m/tasks", label: "Tasks" },
  { href: "/m/calendar", label: "Calendar" },
];

export default function MomentumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5ecff] via-[#eef9ff] to-[#fff0f6] text-zinc-800">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-72 shrink-0 border-r border-white/40 bg-white/35 backdrop-blur-md md:block">
          <div className="p-6">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#c026d3] to-[#6366f1]" />
              <div>
                <div className="text-sm font-semibold leading-tight">Momentum</div>
                <div className="text-xs text-zinc-500">Habits + tasks</div>
              </div>
            </div>

            <nav className="mt-8 flex flex-col gap-2 text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-xl px-3 py-2 text-zinc-700 transition hover:bg-white/50 hover:text-zinc-900"
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="mt-10 rounded-2xl border border-white/50 bg-white/45 p-4">
              <div className="text-xs text-zinc-500">Today focus</div>
              <div className="mt-1 text-sm font-medium">Keep momentum.</div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#c026d3] via-[#a855f7] to-[#6366f1]" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/40 bg-white/30 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 md:px-8">
              <div className="md:hidden text-sm font-semibold">Momentum</div>

              <div className="hidden md:block">
                <div className="text-xs text-zinc-500">Today</div>
                <div className="text-sm font-semibold">Welcome back</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full border border-white/60 bg-white/60" />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-10 md:pb-10">
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/50 bg-white/35 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 py-2 text-xs">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-zinc-700 transition hover:bg-white/50"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#c026d3] to-[#6366f1]" />
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}