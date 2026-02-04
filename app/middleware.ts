import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // ✅ IMPORTANT: res must be re-assignable
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
          // ✅ Write cookies onto the outgoing response
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });

          // ✅ Recreate response to ensure Next sees updated headers
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
  const isAuthPage = pathname.startsWith("/login");
  const isChatPage = pathname.startsWith("/chat");

  // ✅ If not logged in and trying to access chat -> send to login and preserve "next"
  if (!user && isChatPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ✅ If logged in and trying to access login -> go to chat
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "?mode=feel";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/chat/:path*", "/login"],
};
