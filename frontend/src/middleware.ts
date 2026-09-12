import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = ['/', '/dashboard'];
const authPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const demoMode = request.cookies.get('demo_mode')?.value || request.nextUrl.searchParams.get('demo') === '1';
  const path = request.nextUrl.pathname;

  const isProtectedPath = protectedPaths.some(p => p === '/' ? path === '/' : path.startsWith(p));
  const isAuthPath = authPaths.some(p => path === p);

  if (isProtectedPath && !accessToken && !refreshToken && !demoMode) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPath && (accessToken || refreshToken || demoMode)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/register'],
};
