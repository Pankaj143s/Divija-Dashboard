import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, verifySessionToken } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = request.cookies.get(COOKIE_NAME)?.value
  const isValid = token ? await verifySessionToken(token) : false

  // If accessing login page while already authenticated → redirect to dashboard
  if (pathname === '/login') {
    if (isValid) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // All other protected routes require authentication
  if (!isValid) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
