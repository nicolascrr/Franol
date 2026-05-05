import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Public pages ── no auth required
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.next();
  }

  // ── Auth API routes ── no session required
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // ── Other API routes ── require valid signed session
  if (pathname.startsWith("/api/")) {
    const sessionCookie = request.cookies.get("franol-session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifySession(sessionCookie.value);
    if (!payload) {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // ── Protected pages (dashboard, etc.) ── require valid signed session
  const sessionCookie = request.cookies.get("franol-session");

  if (!sessionCookie) {
    return redirectToLanding(request, pathname);
  }

  const payload = await verifySession(sessionCookie.value);
  if (!payload) {
    // Clear the invalid/tampered cookie and redirect
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
