import { useBlocklist }       from '../hooks/useBlocklist'
import { useLockState }       from '../hooks/useLockState'
import { useUnlockRequests }  from '../hooks/useUnlockRequests'
import { useAuth }            from '../hooks/useAuth'
import AddDomainForm          from '../components/AddDomainForm'
import type { BlocklistEntry, UnlockRequest } from '../lib/types'

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

function requestBadge(req: UnlockRequest, blocklist: BlocklistEntry[]) {
  const entry = blocklist.find(b => b.id === req.target_blocklist_id)
  return (
    <div key={req.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-700 font-mono">{entry?.domain ?? 'lock change'}</span>
      <span className="text-yellow-600 text-xs">awaiting friend approval</span>
    </div>
  )
}

export default function Dashboard() {
  const { profile, signOut } = useAuth()
  const { data: blocklist = [], isLoading: blLoading } = useBlocklist()
  const { data: lockState,      isLoading: lsLoading } = useLockState()
  const { data: requests  = [], isLoading: rqLoading } = useUnlockRequests('pending')

  const loading = blLoading || lsLoading || rqLoading

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

        {/* Lock state */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lock state</h2>
          {lsLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : lockState?.locked_until ? (
            <div>
              <p className="text-gray-700 text-sm">
                Locked until <strong>{formatDate(lockState.locked_until)}</strong>
                {' '}({countdown(lockState.locked_until)} remaining)
              </p>
              <p className="text-xs text-gray-400 mt-1">Cooling-off: {lockState.cooling_off_hours}h</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No lock set</p>
          )}
        </section>

        {/* Pending unlock requests */}
        {requests.length > 0 && (
          <section className="bg-white rounded-xl border border-yellow-200 p-6">
            <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3">
              Pending approval ({requests.length})
            </h2>
            {rqLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              requests.map(r => requestBadge(r, blocklist))
            )}
          </section>
        )}

        {/* Blocklist */}
        {/* Add domain */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Block a domain</h2>
          <AddDomainForm />
        </section>

        {/* Blocklist */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Blocklist</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : blocklist.length === 0 ? (
            <p className="text-sm text-gray-400">No domains blocked yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {blocklist.map(entry => (
                <li key={entry.id} className="flex items-center justify-between py-3">
                  <span className="font-mono text-sm text-gray-800">{entry.domain}</span>
                  <div className="flex items-center gap-3">
                    {statusBadge(entry.status)}
                    <span className="text-xs text-gray-400">{formatDate(entry.added_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
