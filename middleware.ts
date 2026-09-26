import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fast gate for signed-in areas: no session cookie → real 307 to /signin
 * before any HTML streams. The pages still verify the token's signature
 * server-side (an expired/forged cookie is caught there).
 */
export function middleware(req: NextRequest) {
  if (req.cookies.has('vybe_session')) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/signin';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/studio/:path*'],
};
