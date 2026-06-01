import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Server-side route protection middleware.
 *
 * Protects /admin/* and /agence/* page routes by verifying the session cookie.
 * API routes are NOT intercepted here — they handle their own auth via getSession().
 *
 * Public routes (login pages, static assets, API) are allowed through.
 */
const SESSION_COOKIE_NAME = 'smartickets_session';
const LEGACY_SESSION_COOKIE_NAME = 'qrtrans_session';

const PUBLIC_PAGE_ROUTES = [
  '/admin/connexion',
  '/admin/login',
  '/agence/connexion',
  '/agence/login',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

function isPublicPageRoute(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some(route => pathname.startsWith(route));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.includes('.') // has extension (CSS, JS, fonts, etc.)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all API routes through — they handle auth themselves
  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow static assets
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPageRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow root page and public service pages
  if (
    pathname === '/' ||
    pathname.startsWith('/passagers') ||
    pathname.startsWith('/expediteurs') ||
    pathname.startsWith('/compagnies') ||
    pathname.startsWith('/ecrans-affichage') ||
    pathname.startsWith('/demo-affichage') ||
    pathname.startsWith('/signage-slug') ||
    pathname.startsWith('/activate') ||
    pathname.startsWith('/retrieve') ||
    pathname.startsWith('/devenir-partenaire') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/tarifs') ||
    pathname.startsWith('/fonctionnalites') ||
    pathname.startsWith('/securite') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/cgu') ||
    pathname.startsWith('/confidentialite') ||
    pathname.startsWith('/documentation') ||
    pathname.startsWith('/blog') ||
    pathname.startsWith('/inscrire') ||
    pathname.startsWith('/pwa') ||
    pathname.startsWith('/driver')
  ) {
    return NextResponse.next();
  }

  // ─── Protected routes (/admin/* and /agence/*) ────────────────────
  // Check for session cookie existence
  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get(SESSION_COOKIE_NAME)?.value ||
    cookieStore.get(LEGACY_SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    // No session → redirect to login
    const loginPath = pathname.startsWith('/admin')
      ? '/admin/connexion'
      : '/agence/connexion';

    const redirectUrl = new URL(loginPath, req.url);
    redirectUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Session cookie exists → allow through (actual validation happens in API calls)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/agence/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/inscrire',
    '/pwa/:path*',
    '/driver/:path*',
  ],
};
