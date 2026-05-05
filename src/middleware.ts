import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public pages ── no auth required, never fail
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.next();
  }

  // ── Auth API routes ── no session required, never fail
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // ── Protected routes ── verify signed session
  try {
    const sessionCookie = request.cookies.get("franol-session");

    if (!sessionCookie) {
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        : redirectToLanding(request, pathname);
    }

    const payload = await verifySession(sessionCookie.value);

    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }

      // Invalid/tampered token — clear cookie and redirect
      const response = redirectToLanding(request, pathname);
      response.cookies.set("franol-session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
      return response;
    }

    return NextResponse.next();
  } catch (error) {
    // If session verification crashes (Edge Runtime issue, missing env var, etc.)
    // fail SAFE: block protected routes rather than letting them through
    console.error("[Middleware] Verification error:", error);

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Erreur de session" }, { status: 500 });
    }

    return redirectToLanding(request, pathname);
  }
}

function redirectToLanding(request: NextRequest, pathname: string): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard",
    "/dashboard/(.*)",
    "/api/(.*)",
  ],
};
