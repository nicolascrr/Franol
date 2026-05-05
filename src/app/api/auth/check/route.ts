import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("franol-session");

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = await verifySession(sessionCookie.value);

    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("[Auth] Check error:", error);
    return NextResponse.json({ authenticated: false });
  }
}
