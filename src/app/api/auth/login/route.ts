import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { timingSafeEqual } from "@/lib/auth/timing-safe";
import { signSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ──
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez plus tard." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSeconds),
          },
        },
      );
    }

    // ── Parse request body ──
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    let body: { password?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { password } = body;

    if (typeof password !== "string" || password.length === 0) {
      return NextResponse.json(
        { error: "Mot de passe requis" },
        { status: 400 },
      );
    }

    // ── Validate password ──
    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword) {
      console.error("[Auth] APP_PASSWORD not configured");
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 },
      );
    }

    if (!timingSafeEqual(password, appPassword)) {
      const remaining = rateLimit.remainingAttempts;
      return NextResponse.json(
        {
          error: "Mot de passe incorrect",
          remainingAttempts: remaining,
        },
        {
          status: 401,
          headers: remaining <= 2
            ? { "X-RateLimit-Remaining": String(remaining) }
            : {},
        },
      );
    }

    // ── Create signed session token ──
    const sessionToken = await signSession({
      authenticated: true,
      timestamp: Date.now(),
    });

    // Reset rate limit on successful login
    resetRateLimit(clientIp);

    const response = NextResponse.json({ success: true });

    response.cookies.set("franol-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
