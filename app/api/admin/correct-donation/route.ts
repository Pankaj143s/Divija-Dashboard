/**
 * POST /api/admin/correct-donation
 *
 * Dashboard-side proxy for the "Edit & Resend" feature.
 * Validates the admin session cookie, then calls the Divija main-site
 * resend-documents API (server-to-server) with a shared ADMIN_SECRET.
 *
 * This keeps the ADMIN_SECRET server-side only — the dashboard browser client
 * never sees the secret or calls Divija directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  // 1. Verify dashboard admin session
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { donationId, corrections, reason } = body

  if (!donationId || typeof donationId !== 'string') {
    return NextResponse.json({ error: 'donationId is required' }, { status: 400 })
  }

  // Validate that at least one correction is being made
  const hasCorrection =
    corrections &&
    typeof corrections === 'object' &&
    Object.keys(corrections).some((k) => corrections[k]?.toString().trim())

  if (!hasCorrection) {
    return NextResponse.json({ error: 'At least one correction field is required' }, { status: 400 })
  }

  // 3. Forward to Divija main site
  const adminSecret = process.env.ADMIN_SECRET
  const divijaSiteUrl = process.env.DIVIJA_SITE_URL

  if (!adminSecret) {
    console.error('❌ ADMIN_SECRET not configured in Dashboard')
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 })
  }

  if (!divijaSiteUrl) {
    console.error('❌ DIVIJA_SITE_URL not configured in Dashboard')
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 })
  }

  const targetUrl = `${divijaSiteUrl}/api/admin/resend-documents`

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSecret}`,
      },
      body: JSON.stringify({
        donationId,
        corrections,
        reason:      reason || '',
        correctedBy: 'dashboard-admin',
      }),
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      console.error(`❌ Divija API returned ${upstream.status}:`, data)
      return NextResponse.json(
        { error: data.error || 'Upstream error' },
        { status: upstream.status }
      )
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('❌ Failed to reach Divija API:', err.message || err)
    return NextResponse.json(
      { error: 'Failed to connect to document service' },
      { status: 502 }
    )
  }
}
