import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { KEYRING_REFERRAL_COOKIE, REFERRAL_CODE_HEX_REGEX } from '../lib/referral-constants';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref');
  if (!ref) {
    return NextResponse.next();
  }
  const normalized = ref.trim().toLowerCase();
  if (!REFERRAL_CODE_HEX_REGEX.test(normalized)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.cookies.set(KEYRING_REFERRAL_COOKIE, normalized, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
  });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
