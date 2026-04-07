/**
 * Admin Donation Actions API
 * POST /api/admin/donations
 *
 * Supports actions: mark_refunded, mark_abandoned
 * Protected by admin session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_ACTIONS = ['mark_refunded', 'mark_abandoned'] as const
type Action = (typeof ALLOWED_ACTIONS)[number]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action, donationId } = body as { action: string; donationId: string }

    if (!action || !donationId) {
      return NextResponse.json({ error: 'Missing action or donationId' }, { status: 400 })
    }

    if (!UUID_RE.test(donationId)) {
      return NextResponse.json({ error: 'Invalid donation ID format' }, { status: 400 })
    }

    if (!ALLOWED_ACTIONS.includes(action as Action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const statusMap: Record<Action, string> = {
      mark_refunded: 'refunded',
      mark_abandoned: 'abandoned',
    }

    const newStatus = statusMap[action as Action]

    const { error } = await supabaseAdmin
      .from('donations')
      .update({ status: newStatus })
      .eq('id', donationId)

    if (error) {
      console.error('Donation action error:', error)
      throw error
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Donation action error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
