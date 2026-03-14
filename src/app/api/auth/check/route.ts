import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('franol-session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false });
    }

    // Vérifier que le cookie est valide
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString()
      );

      if (sessionData.authenticated) {
        return NextResponse.json({ authenticated: true });
      }
    } catch {
      // Cookie invalide
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Erreur vérification auth:', error);
    return NextResponse.json({ authenticated: false });
  }
}
