import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }      from '../hooks/useAuth'
import { useAuditLog }  from '../hooks/useAuditLog'
import type { Profile } from '../lib/types'

const FILTERS = [
  { key: '',                 label: 'All' },
  { key: 'blocklist',        label: 'Blocklist' },
  { key: 'unlock_requests',  label: 'Unlock requests' },
  { key: 'lock_state',       label: 'Lock state' },
] as const

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function actionBadge(action: string) {
  const [table, op] = action.split(':')
  const opColor = {
    insert: 'bg-green-50 text-green-700',
    update: 'bg-blue-50 text-blue-700',
    delete: 'bg-red-50 text-red-700',
  }[op ?? ''] ?? 'bg-gray-50 text-gray-700'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono text-gray-600">{table}</span>
      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${opColor}`}>{op}</span>
    </div>
  )
}

function summaryOf(action: string, payload: Record<string, unknown> | null): string {
  if (!payload) return '—'
  const after  = payload.after  as Record<string, unknown> | undefined
  const before = payload.before as Record<string, unknown> | undefined

  if (action.startsWith('blocklist')) {
    const domain = (after?.domain ?? before?.domain) as string | undefined
    if (!action.endsWith('update')) return domain ?? '—'
    const oldStatus = before?.status as string | undefined
    const newStatus = after?.status as string | undefined
    if (oldStatus !== newStatus) return `${domain}: ${oldStatus} → ${newStatus}`
    return domain ?? '—'
  }

  if (action.startsWith('unlock_requests')) {
    const status = (after?.status ?? before?.status) as string | undefined
    const reason = (after?.reason ?? before?.reason) as string | undefined
    return [status, reason].filter(Boolean).join(' · ')
  }

  if (action.startsWith('lock_state')) {
    const oldLU = before?.locked_until as string | undefined
    const newLU = after?.locked_until  as string | undefined
    if (oldLU !== newLU) {
      return `locked_until: ${oldLU ?? 'none'} → ${newLU ?? 'none'}`
    }
    return 'updated'
  }

  return '—'
}

function useProfiles() {
  return useQuery<Profile[]>({
    queryKey: ['profiles', 'audit'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export default function AuditLog() {
  const { profile, signOut }  = useAuth()
  const [filter, setFilter]   = useState<string>('')
  const { data: log = [], isLoading } = useAuditLog(filter || undefined)
  const { data: profiles = [] }       = useProfiles()
  const profileMap = new Map(profiles.map(p => [p.id, p]))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-gray-900 hover:text-gray-600 transition-colors">
            blockd
          </Link>
          <span className="text-sm text-gray-500">Audit log</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          {isLoading ? (
            <p className="text-sm text-gray-400 p-6">Loading…</p>
          ) : log.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {log.map(entry => {
                const actor = entry.actor ? profileMap.get(entry.actor) : null
                return (
                  <li key={entry.id} className="px-5 py-3 flex items-start gap-4 text-sm">
                    <span className="text-xs text-gray-400 font-mono shrink-0 w-40 pt-0.5">
                      {formatTimestamp(entry.created_at)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        {actionBadge(entry.action)}
                        <span className="text-xs text-gray-400">
                          {actor ? actor.email : entry.actor ? 'unknown user' : 'system'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm font-mono truncate">
                        {summaryOf(entry.action, entry.payload)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
