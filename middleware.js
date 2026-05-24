// middleware.js — Protection des routes du dashboard
// À placer à la racine du projet remine-dashboard (même niveau que pages/)
import { NextResponse } from 'next/server';

// Routes qui ne nécessitent PAS d'authentification
const PUBLIC_ROUTES = ['/', '/api/health'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques et assets
  if (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/api/ai/')   // Les routes API Next.js gèrent leur propre auth
  ) {
    return NextResponse.next();
  }

  // Vérifier le token dans les cookies (plus sûr que localStorage côté serveur)
  // Pour l'instant on laisse le client gérer la redirection via authFetch
  // Ce middleware bloque les routes /dashboard/* sans cookie de session
  const token = request.cookies.get('remine_token');

  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
