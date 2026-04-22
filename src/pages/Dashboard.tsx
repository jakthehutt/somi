import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useBlocklist }       from '../hooks/useBlocklist'
import { useLockState }       from '../hooks/useLockState'
import { useUnlockRequests }  from '../hooks/useUnlockRequests'
import { useAuth }            from '../hooks/useAuth'
import AddDomainForm          from '../components/AddDomainForm'
import LockControls           from '../components/LockControls'
import RequestRemovalModal    from '../components/RequestRemovalModal'
import { formatCountdown, executionTime } from '../lib/countdown'
import type { BlocklistEntry } from '../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function StatusBadge({ status }: { status: BlocklistEntry['status'] }) {
  const styles = {
    active:          'bg-oxblood-tint text-oxblood',
    pending_removal: 'bg-amber-tint text-amber',
    removed:         'bg-sage-tint text-sage',
  }[status]
  const label = { active: 'Blocked', pending_removal: 'Pending', removed: 'Removed' }[status]
  return (
    <span
      className={`${styles} text-micro font-medium px-xs py-2xs tracking-wide`}
      style={{ letterSpacing: '0.06em' }}
    >
      {label}
    </span>
  )
}

// Re-render every 30s so countdowns tick without refetching.
function useTick(intervalMs = 30_000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}

function SectionLabel({ children, accent }: { children: React.ReactNode; accent?: 'ink' | 'oxblood' | 'amber' | 'sage' }) {
  const color = {
    ink: 'text-ink-muted',
    oxblood: 'text-oxblood',
    amber: 'text-amber',
    sage: 'text-sage',
  }[accent ?? 'ink']
  return (
    <h2
      className={`${color} text-micro font-body font-semibold uppercase mb-md`}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </h2>
  )
}

export default function Dashboard() {
  useTick()
  const { profile, signOut } = useAuth()
  const { data: blocklist = [], isLoading: blLoading } = useBlocklist()
  const { data: lockState,      isLoading: lsLoading } = useLockState()
  const { data: activeReq = [], isLoading: rqLoading } = useUnlockRequests('active')

  const [removalTarget, setRemovalTarget] = useState<BlocklistEntry | null>(null)

  const pending  = activeReq.filter(r => r.status === 'pending')
  const approved = activeReq.filter(r => r.status === 'approved')
  const targetedIds = new Set(activeReq.map(r => r.target_blocklist_id).filter(Boolean) as string[])

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule px-lg py-md flex items-center justify-between">
        <h1 className="text-h3 font-display text-ink" style={{ letterSpacing: '-0.015em' }}>
          sovereign mind
        </h1>
        <nav className="flex items-center gap-lg text-small text-ink-muted">
          <Link to="/log" className="hover:text-ink transition-colors">Audit log</Link>
          <span className="text-ink-faint">{profile?.email}</span>
          <button onClick={signOut} className="hover:text-ink transition-colors">
            Sign out
          </button>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-lg pt-2xl pb-3xl">

        {/* Lock state — the room's centerpiece. */}
        <section className="pb-xl">
          <SectionLabel>Lock state</SectionLabel>
          {lsLoading ? (
            <p className="text-body text-ink-faint">Loading…</p>
          ) : lockState?.locked_until ? (
            <div className="flex flex-col gap-2xs">
              <p className="text-h3 font-display text-ink">
                Locked until <span className="text-oxblood">{formatDate(lockState.locked_until)}</span>
              </p>
              <p className="text-small text-ink-muted">
                {formatCountdown(lockState.locked_until)} remaining · cooling-off {lockState.cooling_off_hours}h
              </p>
            </div>
          ) : (
            <p className="text-body text-ink-faint">No lock set.</p>
          )}
          {lockState && (
            <div className="mt-lg">
              <LockControls lockState={lockState} />
            </div>
          )}
        </section>

        {/* Approved, counting down. */}
        {approved.length > 0 && lockState && (
          <section className="border-t border-rule pt-xl pb-xl">
            <SectionLabel accent="sage">Approved — unblocking soon</SectionLabel>
            <ul className="flex flex-col">
              {approved.map(r => {
                const entry = blocklist.find(b => b.id === r.target_blocklist_id)
                const execAt = executionTime(r.approved_at!, lockState.cooling_off_hours)
                return (
                  <li
                    key={r.id}
                    className="flex items-baseline justify-between py-sm border-b border-rule last:border-0 gap-md"
                  >
                    <span className="text-body font-mono text-ink truncate">
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

        {/* Pending friend's call. */}
        {pending.length > 0 && (
          <section className="border-t border-rule pt-xl pb-xl">
            <SectionLabel accent="amber">Pending friend approval</SectionLabel>
            {rqLoading ? (
              <p className="text-body text-ink-faint">Loading…</p>
            ) : (
              <ul className="flex flex-col">
                {pending.map(r => {
                  const entry = blocklist.find(b => b.id === r.target_blocklist_id)
                  return (
                    <li
                      key={r.id}
                      className="flex items-baseline justify-between py-sm border-b border-rule last:border-0 gap-md"
                    >
                      <div className="flex flex-col gap-2xs min-w-0">
                        <span className="text-body font-mono text-ink truncate">
                          {entry?.domain ?? 'lock change'}
                        </span>
                        {r.reason && (
                          <span className="text-small text-ink-muted italic">&ldquo;{r.reason}&rdquo;</span>
                        )}
                      </div>
                      <span className="text-small text-amber shrink-0">awaiting friend</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {/* Block a domain. */}
        <section className="border-t border-rule pt-xl pb-xl">
          <SectionLabel>Block a domain</SectionLabel>
          <AddDomainForm />
        </section>

        {/* Blocklist. */}
        <section className="border-t border-rule pt-xl">
          <SectionLabel>Blocklist</SectionLabel>
          {blLoading ? (
            <p className="text-body text-ink-faint">Loading…</p>
          ) : blocklist.length === 0 ? (
            <p className="text-body text-ink-faint">Nothing blocked yet. Add a domain above to start.</p>
          ) : (
            <ul className="flex flex-col">
              {blocklist.map(entry => {
                const hasRequest = targetedIds.has(entry.id)
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between py-sm border-b border-rule last:border-0 gap-md"
                  >
                    <span className="font-mono text-body text-ink flex-1 truncate">
                      {entry.domain}
                    </span>
                    <div className="flex items-center gap-md shrink-0">
                      <StatusBadge status={entry.status} />
                      <span className="text-micro text-ink-faint hidden sm:inline">
                        {formatDate(entry.added_at)}
                      </span>
                      {entry.status === 'active' && !hasRequest && (
                        <button
                          onClick={() => setRemovalTarget(entry)}
                          className="text-small text-ink-muted hover:text-ink transition-colors border-b border-rule hover:border-ink pb-2xs"
                        >
                          Request removal
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {removalTarget && (
        <RequestRemovalModal
          entry={removalTarget}
          onClose={() => setRemovalTarget(null)}
        />
      )}
    </div>
  )
}
