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

function ActionLabel({ action }: { action: string }) {
  const [table, op] = action.split(':')
  const opColor = {
    insert: 'text-sage',
    update: 'text-ink-muted',
    delete: 'text-oxblood',
  }[op ?? ''] ?? 'text-ink-muted'
  return (
    <span className="flex items-center gap-xs">
      <span className="text-micro font-mono text-ink">{table}</span>
      <span className={`${opColor} text-micro uppercase`} style={{ letterSpacing: '0.1em' }}>
        {op}
      </span>
    </span>
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
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule px-lg py-md flex items-center justify-between">
        <div className="flex items-baseline gap-sm">
          <Link
            to="/"
            className="text-h3 font-display text-ink hover:text-oxblood transition-colors"
            style={{ letterSpacing: '-0.015em' }}
          >
            sovereign mind
          </Link>
          <span
            className="text-micro text-ink-faint uppercase"
            style={{ letterSpacing: '0.14em' }}
          >
            audit log
          </span>
        </div>
        <nav className="flex items-center gap-lg text-small text-ink-muted">
          <span className="text-ink-faint">{profile?.email}</span>
          <button onClick={signOut} className="hover:text-ink transition-colors">
            Sign out
          </button>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-lg pt-2xl pb-3xl">
        <div className="flex gap-xs mb-xl flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-small px-md py-xs border transition-colors ${
                filter === f.key
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-transparent text-ink-muted border-rule hover:border-ink hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-body text-ink-faint">Loading…</p>
        ) : log.length === 0 ? (
          <p className="text-body text-ink-faint">No audit entries yet.</p>
        ) : (
          <ul className="flex flex-col">
            {log.map(entry => {
              const actor = entry.actor ? profileMap.get(entry.actor) : null
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-lg py-sm border-b border-rule last:border-0"
                >
                  <time className="text-micro text-ink-faint font-mono shrink-0 w-44 pt-2xs">
                    {formatTimestamp(entry.created_at)}
                  </time>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-md mb-2xs">
                      <ActionLabel action={entry.action} />
                      <span className="text-micro text-ink-faint">
                        {actor ? actor.email : entry.actor ? 'unknown user' : 'system'}
                      </span>
                    </div>
                    <p className="text-small font-mono text-ink-muted truncate">
                      {summaryOf(entry.action, entry.payload)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
