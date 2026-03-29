import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const nav = [
  { href: "/m", label: "Dashboard" },
  { href: "/m/habits", label: "Habits" },
  { href: "/m/tasks", label: "Tasks" },
  { href: "/m/calendar", label: "Calendar" },
];

export default async function MomentumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function logoutAction() {
    "use server";

    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    redirect("/m/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5ecff] via-[#eef9ff] to-[#fff0f6] text-zinc-800">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        
        {/* SIDEBAR */}
        <aside className="hidden w-72 shrink-0 border-r border-white/40 bg-white/35 backdrop-blur-md md:flex md:flex-col">
          <div className="flex flex-1 flex-col p-6">

            {/* LOGO */}
            <div className="flex items-center gap-3">
              <div className="h-11 w-11">
                <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
                  <defs>
                    <linearGradient id="bg-desktop" x1="8" y1="8" x2="56" y2="56">
                      <stop stopColor="#d946ef" />
                      <stop offset="0.5" stopColor="#a855f7" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>

                    <linearGradient id="stroke-desktop" x1="20" y1="20" x2="44" y2="44">
                      <stop stopColor="white" stopOpacity="0.95" />
                      <stop offset="1" stopColor="white" stopOpacity="0.85" />
                    </linearGradient>
                  </defs>

                  <rect x="6" y="6" width="52" height="52" rx="18" fill="url(#bg-desktop)" />

                  <path
                    d="M18 42L26 26C27 24 29 24 30 26L32 30C33 32 35 32 36 30L38 26C39 24 41 24 42 26L50 42"
                    stroke="url(#stroke-desktop)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />

                  <path
                    d="M20 46C25 41 30 39 32 39C34 39 39 41 44 46"
                    stroke="url(#stroke-desktop)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </svg>
              </div>

              <div>
                <div className="text-[15px] font-semibold">Momentum</div>
                <div className="text-xs text-zinc-500">Habits + tasks</div>
              </div>
            </div>

            {/* NAV */}
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

            {/* FOCUS CARD */}
            <div className="mt-10 rounded-2xl border border-white/50 bg-white/45 p-4">
              <div className="text-xs text-zinc-500">Today focus</div>
              <div className="mt-1 text-sm font-medium">Keep momentum.</div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/70">
                <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-[#c026d3] via-[#a855f7] to-[#6366f1]" />
              </div>
            </div>

            {/* LOGOUT */}
            <div className="mt-auto pt-6">
              {user && (
                <form action={logoutAction}>
                  <button className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm font-medium hover:bg-white/80">
                    Logout
                  </button>
                </form>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col">
          
          {/* HEADER MOBILE */}
          <header className="sticky top-0 z-30 border-b border-white/40 bg-white/30 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 md:px-8">

              <div className="md:hidden flex items-center gap-2">
                <div className="h-8 w-8">
                  <svg viewBox="0 0 64 64" className="h-full w-full" fill="none">
                    <defs>
                      <linearGradient id="bg-mobile" x1="8" y1="8" x2="56" y2="56">
                        <stop stopColor="#d946ef" />
                        <stop offset="0.5" stopColor="#a855f7" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>

                      <linearGradient id="stroke-mobile" x1="20" y1="20" x2="44" y2="44">
                        <stop stopColor="white" stopOpacity="0.95" />
                        <stop offset="1" stopColor="white" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>

                    <rect x="6" y="6" width="52" height="52" rx="18" fill="url(#bg-mobile)" />

                    <path
                      d="M18 42L26 26C27 24 29 24 30 26L32 30C33 32 35 32 36 30L38 26C39 24 41 24 42 26L50 42"
                      stroke="url(#stroke-mobile)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    <path
                      d="M20 46C25 41 30 39 32 39C34 39 39 41 44 46"
                      stroke="url(#stroke-mobile)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold">Momentum</span>
              </div>

              <div className="hidden md:block">
                <div className="text-xs text-zinc-500">Today</div>
                <div className="text-sm font-semibold">Welcome back</div>
              </div>

              {user && (
                <form action={logoutAction} className="md:hidden">
                  <button className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2 text-sm hover:bg-white/80">
                    Logout
                  </button>
                </form>
              )}
            </div>
          </header>

          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-10 md:pb-10">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/50 bg-white/35 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 py-2 text-xs">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-zinc-700 hover:bg-white/50"
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