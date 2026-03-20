/**
 * Admin Login API
 * POST /api/admin/login
 *
 * Accepts: { username: string, password: string }
 * Credentials are checked against ADMIN_USERNAME and ADMIN_PASSWORD env vars.
 * The session cookie is signed with SESSION_SECRET (separate from credentials).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCredentials, setAdminSession } from '@/lib/admin-auth'

// ---------------------------------------------------------------------------
// In-memory rate limiter
//
// Tracks failed login attempts per IP address. Resets on server restart, which
// is acceptable for an internal dashboard. A Redis-backed limiter would be
// needed for multi-instance deployments, but is out of scope here.
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

interface AttemptRecord { count: number; resetAt: number }
const loginAttempts = new Map<string, AttemptRecord>()

function getClientIp(request: NextRequest): string {
  // In production behind a proxy, prefer x-forwarded-for
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) return false
  return record.count >= MAX_ATTEMPTS
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    record.count += 1
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip)
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { username, password } = body

    if (
      !username || typeof username !== 'string' ||
      !password || typeof password !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 },
      )
    }

    if (!verifyCredentials(username.trim(), password)) {
      recordFailedAttempt(ip)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      )
    }

    clearAttempts(ip)
    const response = NextResponse.json({ success: true })
    await setAdminSession(response)
    return response
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
