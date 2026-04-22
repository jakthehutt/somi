/**
 * RLS integration tests — runs against the live cloud Supabase project.
 * Creates ephemeral test users via the admin API, exercises each policy,
 * then deletes all test data in afterAll.
 *
 * Run: npm test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
// Vitest loads all env vars from .env via loadEnv (configured in vitest.config.ts)
const URL  = import.meta.env.VITE_SUPABASE_URL as string
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SRK  = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!URL || !ANON || !SRK) {
  throw new Error('Missing required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY')
}

const admin = createClient(URL, SRK, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function asToken(token: string): SupabaseClient {
  return createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Test state shared across tests
const ts = Date.now()
const ownerEmail  = `rls-owner-${ts}@blockd.internal`
const friendEmail = `rls-friend-${ts}@blockd.internal`
const PASSWORD    = 'TestBlockd_RLS_123!'

let ownerToken:  string
let friendToken: string
let ownerUserId: string
let friendUserId: string
let blockId:     string
let reqId:       string

beforeAll(async () => {
  // Create owner
  const { data: { user: ou }, error: oErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'owner' },
  })
  if (oErr || !ou) throw new Error(`Could not create owner user: ${oErr?.message}`)
  ownerUserId = ou.id

  // Create friend
  const { data: { user: fu }, error: fErr } = await admin.auth.admin.createUser({
    email: friendEmail,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'friend' },
  })
  if (fErr || !fu) throw new Error(`Could not create friend user: ${fErr?.message}`)
  friendUserId = fu.id

  // Sign in to get session tokens
  const pub = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: { session: os }, error: osErr } = await pub.auth.signInWithPassword({
    email: ownerEmail, password: PASSWORD,
  })
  if (osErr || !os) throw new Error(`Owner sign-in failed: ${osErr?.message}`)
  ownerToken = os.access_token

  const { data: { session: fs }, error: fsErr } = await pub.auth.signInWithPassword({
    email: friendEmail, password: PASSWORD,
  })
  if (fsErr || !fs) throw new Error(`Friend sign-in failed: ${fsErr?.message}`)
  friendToken = fs.access_token
})

afterAll(async () => {
  // Clean up in dependency order
  if (reqId)      await admin.from('unlock_requests').delete().eq('id', reqId)
  if (blockId)    await admin.from('blocklist').delete().eq('id', blockId)
  if (ownerUserId)  await admin.auth.admin.deleteUser(ownerUserId)
  if (friendUserId) await admin.auth.admin.deleteUser(friendUserId)
})

// ─── helpers ──────────────────────────────────────────────────────────────

describe('blocklist', () => {
  it('owner can insert an active domain', async () => {
    const owner = asToken(ownerToken)
    const { data, error } = await owner.from('blocklist').insert({
      domain: `rls-test-${ts}.com`,
      added_by: ownerUserId,
      status: 'active',
    }).select('id').single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    blockId = data!.id
  })

  it('owner cannot insert a domain with status=removed', async () => {
    const owner = asToken(ownerToken)
    const { error } = await owner.from('blocklist').insert({
      domain: `rls-test-removed-${ts}.com`,
      added_by: ownerUserId,
      status: 'removed',
    })
    expect(error).not.toBeNull()
  })

  it('owner can mark a domain as pending_removal', async () => {
    const owner = asToken(ownerToken)
    const { error } = await owner
      .from('blocklist')
      .update({ status: 'pending_removal' })
      .eq('id', blockId)
    expect(error).toBeNull()
  })

  it('owner cannot set status=removed directly', async () => {
    const owner = asToken(ownerToken)
    const { data, error } = await owner
      .from('blocklist')
      .update({ status: 'removed' })
      .eq('id', blockId)
      .select()

    // RLS either raises an error or silently returns 0 rows
    const rowsUpdated = data?.length ?? 0
    const isBlocked = error !== null || rowsUpdated === 0
    expect(isBlocked).toBe(true)

    // Restore for next tests
    await admin.from('blocklist').update({ status: 'active' }).eq('id', blockId)
  })

  it('friend cannot insert into blocklist', async () => {
    const friend = asToken(friendToken)
    const { error } = await friend.from('blocklist').insert({
      domain: `rls-friend-insert-${ts}.com`,
      added_by: friendUserId,
      status: 'active',
    })
    expect(error).not.toBeNull()
  })

  it('service role (pg_cron) can set status=removed after cooling-off', async () => {
    const { error } = await admin
      .from('blocklist')
      .update({ status: 'removed' })
      .eq('id', blockId)
    expect(error).toBeNull()

    // Restore to active for unlock_requests tests
    await admin.from('blocklist').update({ status: 'active' }).eq('id', blockId)
  })
})

describe('unlock_requests', () => {
  it('owner can submit a pending unlock request', async () => {
    const owner = asToken(ownerToken)
    const { data, error } = await owner.from('unlock_requests').insert({
      target_blocklist_id: blockId,
      requested_by: ownerUserId,
      status: 'pending',
      reason: 'RLS test',
    }).select('id').single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    reqId = data!.id
  })

  it('owner cannot self-approve (cannot insert with status=approved)', async () => {
    const owner = asToken(ownerToken)
    const { error } = await owner.from('unlock_requests').insert({
      target_blocklist_id: blockId,
      requested_by: ownerUserId,
      status: 'approved',
      approved_at: new Date().toISOString(),
      friend_user_id: friendUserId,
    })
    expect(error).not.toBeNull()
  })

  it('friend can read all pending unlock requests', async () => {
    const friend = asToken(friendToken)
    const { data, error } = await friend
      .from('unlock_requests')
      .select('id, status')
      .eq('id', reqId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].status).toBe('pending')
  })

  it('friend can approve a pending request', async () => {
    const friend = asToken(friendToken)
    const { error } = await friend
      .from('unlock_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        friend_user_id: friendUserId,
      })
      .eq('id', reqId)
    expect(error).toBeNull()
  })

  it('friend cannot re-approve an already-approved request', async () => {
    const friend = asToken(friendToken)
    const { data, error } = await friend
      .from('unlock_requests')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        friend_user_id: friendUserId,
      })
      .eq('id', reqId)
      .select()

    // USING clause filters out non-pending rows — 0 rows updated, no error
    const rowsUpdated = data?.length ?? 0
    expect(error).toBeNull()  // no error, just silent block
    expect(rowsUpdated).toBe(0)
  })
})

describe('lock_state', () => {
  it('owner can extend locked_until', async () => {
    const owner = asToken(ownerToken)
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await owner
      .from('lock_state')
      .update({ locked_until: future })
      .eq('id', 1)
    expect(error).toBeNull()
  })

  it('owner cannot shorten locked_until', async () => {
    const owner = asToken(ownerToken)
    const sooner = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
    const { data, error } = await owner
      .from('lock_state')
      .update({ locked_until: sooner })
      .eq('id', 1)
      .select()

    const rowsUpdated = data?.length ?? 0
    const isBlocked = error !== null || rowsUpdated === 0
    expect(isBlocked).toBe(true)
  })

  afterAll(async () => {
    // Reset lock_state
    await admin.from('lock_state').update({ locked_until: null }).eq('id', 1)
  })
})
