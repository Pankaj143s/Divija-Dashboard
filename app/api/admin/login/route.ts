/**
 * Admin Login API
 * POST /api/admin/login
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setAdminSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      )
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 },
      )
    }

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
