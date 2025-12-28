import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Pages publiques - pas de vérification
  if (pathname === '/' || pathname === '/login') {
    return NextResponse.next();
  }
  
  // Routes API auth - pas de vérification
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Autres routes API - vérifier la session
  if (pathname.startsWith('/api/')) {
    const sessionCookie = request.cookies.get('franol-session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.next();
  }
  
  // Pages protégées (dashboard, etc.) - vérifier la session
  const sessionCookie = request.cookies.get('franol-session');
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/api/:path*'],
};
