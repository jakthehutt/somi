import { useState } from 'react'
import { useBlocklist }       from '../hooks/useBlocklist'
import { useLockState }       from '../hooks/useLockState'
import { useUnlockRequests }  from '../hooks/useUnlockRequests'
import { useAuth }            from '../hooks/useAuth'
import AddDomainForm          from '../components/AddDomainForm'
import RequestRemovalModal    from '../components/RequestRemovalModal'
import type { BlocklistEntry } from '../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function statusBadge(status: BlocklistEntry['status']) {
  const map = {
    active:          'bg-red-100 text-red-700',
    pending_removal: 'bg-yellow-100 text-yellow-700',
    removed:         'bg-green-100 text-green-700',
  }
  const label = { active: 'Blocked', pending_removal: 'Pending removal', removed: 'Removed' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status]}`}>
      {label[status]}
    </span>
  )
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const { data: blocklist = [], isLoading: blLoading } = useBlocklist()
  const { data: lockState,      isLoading: lsLoading } = useLockState()
  const { data: requests  = [], isLoading: rqLoading } = useUnlockRequests('pending')

  const [removalTarget, setRemovalTarget] = useState<BlocklistEntry | null>(null)

  // Map: blocklist.id → true if there is a pending unlock request for it
  const pendingIds = new Set(requests.filter(r => r.target_blocklist_id).map(r => r.target_blocklist_id!))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">blockd</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lock state</h2>
          {lsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : lockState?.locked_until ? (
            <div>
              <p className="text-gray-700 text-sm">
                Locked until <strong>{formatDate(lockState.locked_until)}</strong>{' '}
                ({countdown(lockState.locked_until)} remaining)
              </p>
              <p className="text-xs text-gray-400 mt-1">Cooling-off: {lockState.cooling_off_hours}h</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No lock set</p>
          )}
        </section>

        {requests.length > 0 && (
          <section className="bg-white rounded-xl border border-yellow-200 p-6">
            <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3">
              Pending approval ({requests.length})
            </h2>
            {rqLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              requests.map(r => {
                const entry = blocklist.find(b => b.id === r.target_blocklist_id)
                return (
                  <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="text-gray-700 font-mono">{entry?.domain ?? 'lock change'}</span>
                      {r.reason && <p className="text-xs text-gray-400 mt-0.5 italic">"{r.reason}"</p>}
                    </div>
                    <span className="text-yellow-600 text-xs">awaiting friend</span>
                  </div>
                )
              })
            )}
          </section>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Block a domain</h2>
          <AddDomainForm />
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Blocklist</h2>
          {blLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : blocklist.length === 0 ? (
            <p className="text-sm text-gray-400">No domains blocked yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {blocklist.map(entry => {
                const isPending = pendingIds.has(entry.id)
                return (
                  <li key={entry.id} className="flex items-center justify-between py-3 gap-3">
                    <span className="font-mono text-sm text-gray-800 flex-1 truncate">{entry.domain}</span>
                    <div className="flex items-center gap-3">
                      {statusBadge(entry.status)}
                      <span className="text-xs text-gray-400 hidden sm:inline">{formatDate(entry.added_at)}</span>
                      {entry.status === 'active' && !isPending && (
                        <button
                          onClick={() => setRemovalTarget(entry)}
                          className="text-xs text-gray-500 hover:text-gray-900 border border-gray-300 rounded-md px-2 py-1 transition-colors"
                        >
                          Request removal
                        </button>
                      )}
                      {isPending && (
                        <span className="text-xs text-yellow-600 px-2 py-1">pending</span>
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
