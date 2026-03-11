/**
 * Admin Logout API
 * POST /api/admin/logout
 */

import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/admin-auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearAdminSession(response)
  return response
}
