import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword) {
      console.error("APP_PASSWORD non configuré");
      return NextResponse.json(
        { error: "Configuration serveur manquante" },
        { status: 500 },
      );
    }

    if (password !== appPassword) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 },
      );
    }

    const sessionToken = Buffer.from(
      JSON.stringify({
        authenticated: true,
        timestamp: Date.now(),
      }),
    ).toString("base64");

    const response = NextResponse.json({ success: true });

    // Configuration du cookie de session - 24 heures
    response.cookies.set("franol-session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 heures
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur login:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
