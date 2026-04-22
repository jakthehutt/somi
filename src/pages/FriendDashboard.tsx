import { useQuery }            from '@tanstack/react-query'
import { supabase }             from '../lib/supabase'
import { useAuth }              from '../hooks/useAuth'
import { useUnlockRequests }    from '../hooks/useUnlockRequests'
import { useLockState }         from '../hooks/useLockState'
import { useApproveRequest }    from '../hooks/useApproveRequest'
import { formatCountdown, executionTime } from '../lib/countdown'
import type { BlocklistEntry, Profile, UnlockRequest, LockState } from '../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// Friend needs to read the blocklist and owner profiles — small map queries.
function useBlocklistAll() {
  return useQuery<BlocklistEntry[]>({
    queryKey: ['blocklist', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blocklist').select('*')
      if (error) throw error
      return data ?? []
    },
  })
}

function useProfiles() {
  return useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return data ?? []
    },
  })
}

function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: 'ink' | 'sage' | 'amber' }) {
  const color = { ink: 'text-ink-muted', sage: 'text-sage', amber: 'text-amber' }[accent ?? 'ink']
  return (
    <h2
      className={`${color} text-micro font-body font-semibold uppercase mb-md`}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </h2>
  )
}

function RequestCard({
  req, entry, requester, lockState,
}: {
  req: UnlockRequest
  entry?: BlocklistEntry
  requester?: Profile
  lockState?: LockState
}) {
  const approve = useApproveRequest()
  const pending = approve.isPending
  return (
    <article className="py-lg border-b border-rule last:border-0">
      <div className="flex items-start justify-between gap-lg mb-md">
        <div className="min-w-0">
          <p
            className="text-micro text-ink-faint uppercase mb-xs"
            style={{ letterSpacing: '0.12em' }}
          >
            Request to unblock
          </p>
          <p className="font-mono text-h3 text-ink truncate">{entry?.domain ?? 'lock change'}</p>
          {req.reason && (
            <p className="text-body text-ink-muted italic mt-sm" style={{ maxWidth: '52ch' }}>
              &ldquo;{req.reason}&rdquo;
            </p>
          )}
        </div>
        <time className="text-small text-ink-faint shrink-0 pt-2xs">
          {formatDate(req.requested_at)}
        </time>
      </div>

      <div className="flex items-center justify-between gap-md flex-wrap">
        <p className="text-small text-ink-muted">
          From <span className="text-ink font-mono">{requester?.email ?? 'unknown'}</span>
          {lockState && (
            <> &middot; if approved, unblocks after {lockState.cooling_off_hours}h</>
          )}
        </p>
        <div className="flex gap-sm">
          <button
            onClick={() => approve.mutate({ requestId: req.id, approve: false })}
            disabled={pending}
            className="text-small text-ink-muted hover:text-ink border border-rule hover:border-ink px-md py-xs disabled:opacity-50 transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => approve.mutate({ requestId: req.id, approve: true })}
            disabled={pending}
            className="bg-oxblood text-paper hover:bg-oxblood-hover disabled:opacity-50 px-md py-xs text-small font-medium transition-colors"
          >
            {pending ? 'Saving…' : 'Approve'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function FriendDashboard() {
  const { profile, signOut }                  = useAuth()
  const { data: pending = [], isLoading: pl } = useUnlockRequests('pending')
  const { data: all     = [], isLoading: al } = useUnlockRequests('all')
  const { data: blocklist = [] }              = useBlocklistAll()
  const { data: profiles  = [] }              = useProfiles()
  const { data: lockState }                   = useLockState()

  // Approved but not yet executed — friend sees the live countdown too.
  const awaitingExecution = all.filter(r => r.status === 'approved')

  const blocklistMap = new Map(blocklist.map(b => [b.id, b]))
  const profileMap   = new Map(profiles.map(p => [p.id, p]))

  // Recent non-pending history, most recent first.
  const history = all.filter(r => r.status !== 'pending').slice(0, 20)

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule px-lg py-md flex items-center justify-between">
        <div className="flex items-baseline gap-sm">
          <h1 className="text-h3 font-display text-ink" style={{ letterSpacing: '-0.015em' }}>
            sovereign mind
          </h1>
          <span
            className="text-micro text-ink-faint uppercase"
            style={{ letterSpacing: '0.14em' }}
          >
            friend
          </span>
        </div>
        <nav className="flex items-center gap-lg text-small text-ink-muted">
          <span className="text-ink-faint">{profile?.email}</span>
          <button onClick={signOut} className="hover:text-ink transition-colors">
            Sign out
          </button>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-lg pt-2xl pb-3xl">
        <section className="pb-xl">
          <SectionLabel>
            Pending requests {pending.length > 0 && `(${pending.length})`}
          </SectionLabel>
          {pl ? (
            <p className="text-body text-ink-faint">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-body text-ink-faint">Nothing waiting on you right now.</p>
          ) : (
            <div className="flex flex-col">
              {pending.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  entry={req.target_blocklist_id ? blocklistMap.get(req.target_blocklist_id) : undefined}
                  requester={profileMap.get(req.requested_by)}
                  lockState={lockState}
                />
              ))}
            </div>
          )}
        </section>

        {awaitingExecution.length > 0 && lockState && (
          <section className="border-t border-rule pt-xl pb-xl">
            <SectionLabel accent="sage">
              Approved — executing soon ({awaitingExecution.length})
            </SectionLabel>
            <ul className="flex flex-col">
              {awaitingExecution.map(r => {
                const entry = r.target_blocklist_id ? blocklistMap.get(r.target_blocklist_id) : undefined
                const execAt = executionTime(r.approved_at!, lockState.cooling_off_hours)
                return (
                  <li
                    key={r.id}
                    className="flex items-baseline justify-between py-sm border-b border-rule last:border-0 gap-md"
                  >
                    <span className="font-mono text-body text-ink truncate">
                      {entry?.domain ?? 'lock change'}
                    </span>
                    <span className="text-small text-sage shrink-0">
                      unblocks in {formatCountdown(execAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {history.length > 0 && (
          <section className="border-t border-rule pt-xl">
            <SectionLabel>History</SectionLabel>
            {al ? (
              <p className="text-body text-ink-faint">Loading…</p>
            ) : (
              <ul className="flex flex-col">
                {history.map(req => {
                  const entry = req.target_blocklist_id ? blocklistMap.get(req.target_blocklist_id) : undefined
                  const statusColor = {
                    approved: 'text-sage',
                    denied:   'text-oxblood',
                    executed: 'text-sage',
                    pending:  'text-amber',
                  }[req.status]
                  return (
                    <li
                      key={req.id}
                      className="flex items-baseline justify-between py-sm border-b border-rule last:border-0 gap-md"
                    >
                      <span className="font-mono text-body text-ink truncate">
                        {entry?.domain ?? 'lock change'}
                      </span>
                      <div className="flex items-center gap-md shrink-0">
                        <span
                          className={`${statusColor} text-micro uppercase`}
                          style={{ letterSpacing: '0.1em' }}
                        >
                          {req.status}
                        </span>
                        <span className="text-micro text-ink-faint">
                          {formatDate(req.requested_at)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
