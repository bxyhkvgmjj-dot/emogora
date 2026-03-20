import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: { headers: req.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });

          res = NextResponse.next({
            request: { headers: req.headers },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  const isEmogoraLoginPage = pathname === "/login";
  const isChatPage = pathname.startsWith("/chat");

  const isMomentumLoginPage = pathname === "/m/login";
  const isMomentumPage = pathname === "/m" || pathname.startsWith("/m/");

  // Protect Emogora chat
  if (!user && isChatPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from Emogora login
  if (user && isEmogoraLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "?mode=feel";
    return NextResponse.redirect(url);
  }

  // Protect Momentum pages, but allow /m/login
  if (!user && isMomentumPage && !isMomentumLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/m/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from Momentum login
  if (user && isMomentumLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/m";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/chat/:path*", "/login", "/m", "/m/:path*"],
};