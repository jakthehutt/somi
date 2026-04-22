/**
 * sync-nextdns — Deno edge function
 *
 * Called via pg_net HTTP request whenever a blocklist row changes status.
 * Syncs the change to the NextDNS denylist API.
 * Idempotent: re-running with the same state is a no-op.
 *
 * Payload (JSON body from the Postgres trigger):
 *   { domain: string, status: "active" | "pending_removal" | "removed" }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const NEXTDNS_BASE = 'https://api.nextdns.io'

interface Payload {
  domain: string
  status: 'active' | 'pending_removal' | 'removed'
}

async function syncToNextDNS(payload: Payload): Promise<void> {
  const profileId = Deno.env.get('NEXTDNS_PROFILE_ID')
  const apiKey    = Deno.env.get('NEXTDNS_API_KEY')

  if (!profileId || !apiKey) {
    throw new Error('NEXTDNS_PROFILE_ID and NEXTDNS_API_KEY must be set')
  }

  const base    = `${NEXTDNS_BASE}/profiles/${profileId}/denylist`
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }
  const { domain, status } = payload

  if (status === 'active' || status === 'pending_removal') {
    // Domain should be blocked — add to denylist (idempotent: NextDNS ignores duplicates)
    const res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: domain, active: true }),
    })
    if (!res.ok && res.status !== 409) {
      throw new Error(`NextDNS add failed: ${res.status} ${await res.text()}`)
    }
  } else if (status === 'removed') {
    // Domain should be unblocked — remove from denylist
    const res = await fetch(`${base}/${encodeURIComponent(domain)}`, {
      method: 'DELETE',
      headers,
    })
    // 404 is fine — domain wasn't in denylist (idempotent)
    if (!res.ok && res.status !== 404) {
      throw new Error(`NextDNS remove failed: ${res.status} ${await res.text()}`)
    }
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // JWT verification is handled by Supabase (deploy without --no-verify-jwt).
  // The Postgres trigger calls this with the anon JWT; Supabase validates the signature.

  let payload: Payload
  try {
    payload = await req.json() as Payload
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!payload.domain || !payload.status) {
    return new Response('Missing domain or status in payload', { status: 400 })
  }

  try {
    await syncToNextDNS(payload)
    return new Response(
      JSON.stringify({ ok: true, domain: payload.domain, status: payload.status }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sync-nextdns] Error:', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
