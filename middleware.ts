import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pages publiques - pas de vérification
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.next();
  }

  // Routes API auth - pas de vérification
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Autres routes API - vérifier la session
  if (pathname.startsWith("/api/")) {
    const sessionCookie = request.cookies.get("franol-session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Pages protégées (dashboard, etc.) - vérifier la session
  const sessionCookie = request.cookies.get("franol-session");

  if (!sessionCookie) {
    // Rediriger vers l'accueil en gardant l'URL de destination
    const url = new URL("/", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Vérifier que le cookie est valide
  try {
    const decoded = atob(sessionCookie.value);
    const sessionData = JSON.parse(decoded);

    if (!sessionData.authenticated) {
      const url = new URL("/", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    // Cookie invalide, rediriger vers l'accueil
    const url = new URL("/", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*"],
};
