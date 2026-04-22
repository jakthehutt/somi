import { useQuery }            from '@tanstack/react-query'
import { supabase }             from '../lib/supabase'
import { useAuth }              from '../hooks/useAuth'
import { useUnlockRequests }    from '../hooks/useUnlockRequests'
import { useApproveRequest }    from '../hooks/useApproveRequest'
import type { BlocklistEntry, Profile, UnlockRequest } from '../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// Friend needs to see blocklist domains and owner profiles — small map queries
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

function RequestCard({
  req, entry, requester,
}: {
  req: UnlockRequest
  entry?: BlocklistEntry
  requester?: Profile
}) {
  const approve = useApproveRequest()
  const pending = approve.isPending
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Request to unblock</p>
          <p className="font-mono text-gray-900 text-base">{entry?.domain ?? 'lock change'}</p>
          {req.reason && (
            <p className="text-sm text-gray-600 mt-2 italic">"{req.reason}"</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">
          {formatDate(req.requested_at)}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          From <span className="text-gray-700">{requester?.email ?? 'unknown'}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => approve.mutate({ requestId: req.id, approve: false })}
            disabled={pending}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-4 py-1.5 disabled:opacity-50 transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => approve.mutate({ requestId: req.id, approve: true })}
            disabled={pending}
            className="bg-gray-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Saving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FriendDashboard() {
  const { profile, signOut }                  = useAuth()
  const { data: pending = [], isLoading: pl } = useUnlockRequests('pending')
  const { data: all     = [], isLoading: al } = useUnlockRequests('all')
  const { data: blocklist = [] }              = useBlocklistAll()
  const { data: profiles  = [] }              = useProfiles()

  const blocklistMap = new Map(blocklist.map(b => [b.id, b]))
  const profileMap   = new Map(profiles.map(p => [p.id, p]))

  // History = non-pending requests
  const history = all.filter(r => r.status !== 'pending').slice(0, 20)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">blockd · friend</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Pending requests {pending.length > 0 && `(${pending.length})`}
          </h2>
          {pl ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">No pending requests.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  entry={req.target_blocklist_id ? blocklistMap.get(req.target_blocklist_id) : undefined}
                  requester={profileMap.get(req.requested_by)}
                />
              ))}
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {al ? (
                <p className="text-sm text-gray-400 p-4">Loading…</p>
              ) : (
                history.map(req => {
                  const entry = req.target_blocklist_id ? blocklistMap.get(req.target_blocklist_id) : undefined
                  const statusColor = {
                    approved: 'text-green-600',
                    denied:   'text-red-600',
                    executed: 'text-blue-600',
                    pending:  'text-yellow-600',
                  }[req.status]
                  return (
                    <div key={req.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-mono text-gray-800">{entry?.domain ?? 'lock change'}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs uppercase tracking-wide ${statusColor}`}>{req.status}</span>
                        <span className="text-xs text-gray-400">{formatDate(req.requested_at)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
