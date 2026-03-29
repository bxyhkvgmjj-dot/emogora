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
        <aside className="hidden w-72 shrink-0 border-r border-white/40 bg-white/35 backdrop-blur-md md:flex md:flex-col">
          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0">
                <svg
                  viewBox="0 0 64 64"
                  className="h-full w-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Momentum logo"
                >
                  <defs>
                    <linearGradient id="momentum-bg" x1="8" y1="8" x2="56" y2="56">
                      <stop stopColor="#d946ef" />
                      <stop offset="0.5" stopColor="#a855f7" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>

                    <linearGradient id="momentum-stroke" x1="18" y1="18" x2="47" y2="46">
                      <stop stopColor="white" stopOpacity="0.98" />
                      <stop offset="1" stopColor="white" stopOpacity="0.84" />
                    </linearGradient>
                  </defs>

                  <rect
                    x="6"
                    y="6"
                    width="52"
                    height="52"
                    rx="18"
                    fill="url(#momentum-bg)"
                  />

                  <path
                    d="M16 40C19 33 22 26 26 26C29 26 31 31 32 33.5C33 31 35 26 38 26C42 26 45 33 48 40"
                    stroke="url(#momentum-stroke)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M18 44C21.5 39.5 25 37.2 28.4 37.2C30 37.2 31.2 37.7 32 38.4C32.8 37.7 34 37.2 35.6 37.2C39 37.2 42.5 39.5 46 44"
                    stroke="url(#momentum-stroke)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                </svg>
              </div>

              <div>
                <div className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
                  Momentum
                </div>
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

            <div className="mt-auto pt-6">
              {user ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-2xl border border-white/60 bg-white/60 px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-white/80"
                  >
                    Logout
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/40 bg-white/30 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3 md:px-8">
              <div className="md:hidden flex items-center gap-2">
                <div className="h-8 w-8 shrink-0">
                  <svg
                    viewBox="0 0 64 64"
                    className="h-full w-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-label="Momentum logo"
                  >
                    <defs>
                      <linearGradient id="momentum-bg-mobile" x1="8" y1="8" x2="56" y2="56">
                        <stop stopColor="#d946ef" />
                        <stop offset="0.5" stopColor="#a855f7" />
                        <stop offset="1" stopColor="#6366f1" />
                      </linearGradient>

                      <linearGradient id="momentum-stroke-mobile" x1="18" y1="18" x2="47" y2="46">
                        <stop stopColor="white" stopOpacity="0.98" />
                        <stop offset="1" stopColor="white" stopOpacity="0.84" />
                      </linearGradient>
                    </defs>

                    <rect
                      x="6"
                      y="6"
                      width="52"
                      height="52"
                      rx="18"
                      fill="url(#momentum-bg-mobile)"
                    />

                    <path
                      d="M16 40C19 33 22 26 26 26C29 26 31 31 32 33.5C33 31 35 26 38 26C42 26 45 33 48 40"
                      stroke="url(#momentum-stroke-mobile)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M18 44C21.5 39.5 25 37.2 28.4 37.2C30 37.2 31.2 37.7 32 38.4C32.8 37.7 34 37.2 35.6 37.2C39 37.2 42.5 39.5 46 44"
                      stroke="url(#momentum-stroke-mobile)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
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

              <div className="md:hidden">
                {user ? (
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white/80"
                    >
                      Logout
                    </button>
                  </form>
                ) : null}
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