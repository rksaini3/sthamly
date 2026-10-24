import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that need a signed-in user. Each route still checks its own rules
// (role, consent, verification). This is only the first gate.
const PROTECTED_PATHS = [
  "/plan",
  "/track",
  "/ask",
  "/profile",
  "/consent",
  "/consult",
  "/practitioner",
  "/admin",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refreshes the session cookie when needed. Do not remove this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static files, the service worker, manifest, icons and API routes.
    // API routes check their own auth.
    "/((?!_next/static|_next/image|api/|auth/|sw\\.js|manifest\\.webmanifest|icons/|favicon\\.ico).*)",
  ],
};