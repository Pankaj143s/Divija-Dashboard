/**
 * Admin Authentication Utilities
 *
 * Uses HMAC-SHA256 signed session cookie keyed with SESSION_SECRET.
 * Credentials (username + password) are checked against ADMIN_USERNAME
 * and ADMIN_PASSWORD — these are intentionally separate from the session
 * signing secret so a compromised credential cannot forge session tokens.
 *
 * Works in both Node.js API routes and Edge Runtime (middleware).
 */

import { type NextRequest, NextResponse } from 'next/server'

export const COOKIE_NAME = 'divija_admin_session'
const SESSION_PAYLOAD = 'divija-admin-authenticated'
const MAX_AGE = 60 * 60 * 24 // 24 hours

// ---------------------------------------------------------------------------
// Helpers — Web Crypto API (works in both Node.js and Edge runtimes)
// ---------------------------------------------------------------------------

/** Returns the secret used exclusively for HMAC session signing. */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  return secret
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacVerify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSign(payload, secret)
  if (expected.length !== signature.length) return false
  // Constant-time comparison — prevents timing attacks
  let result = 0
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return result === 0
}

/** Constant-time string equality — prevents timing-based enumeration. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create the session token (HMAC of fixed payload signed with SESSION_SECRET). */
export async function createSessionToken(): Promise<string> {
  return hmacSign(SESSION_PAYLOAD, getSessionSecret())
}

/** Verify a session token string. */
export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    return await hmacVerify(SESSION_PAYLOAD, token, getSessionSecret())
  } catch {
    return false
  }
}

/** Check if the incoming request has a valid admin session cookie. */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return false
  return verifySessionToken(token)
}

/** Set the admin session cookie on a NextResponse. */
export async function setAdminSession(response: NextResponse): Promise<void> {
  const token = await createSessionToken()
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

/** Clear the admin session cookie on a NextResponse. */
export function clearAdminSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/**
 * Verify admin credentials (username + password) using constant-time comparison.
 * Both fields are checked regardless of which one fails to avoid timing oracle attacks.
 * Returns false (not throws) on any missing config so the login route can handle it safely.
 */
export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedUsername || !expectedPassword) return false
  const usernameOk = safeEqual(username, expectedUsername)
  const passwordOk = safeEqual(password, expectedPassword)
  // Both checks are always evaluated — no short-circuit to prevent timing leaks
  return usernameOk && passwordOk
}
