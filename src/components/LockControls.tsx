import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../hooks/useAuth'
import { formatCountdown } from '../lib/countdown'
import type { LockState } from '../lib/types'

const QUICK_EXTENSIONS = [
  { label: '+1 day',   days: 1 },
  { label: '+7 days',  days: 7 },
  { label: '+30 days', days: 30 },
]

interface Props {
  lockState: LockState
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-micro font-body font-semibold text-ink-muted uppercase mb-3"
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </h3>
  )
}

export default function LockControls({ lockState }: Props) {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const [shorteningTo, setShorteningTo] = useState('')
  const [shortenReason, setShortenReason] = useState('')
  const [showShortenForm, setShowShortenForm] = useState(false)

  const current = lockState.locked_until ? new Date(lockState.locked_until) : null

  const extend = useMutation({
    mutationFn: async (days: number) => {
      const base = current && current.getTime() > Date.now() ? current.getTime() : Date.now()
      const newTime = new Date(base + days * 24 * 3_600_000).toISOString()
      const { error } = await supabase
        .from('lock_state')
        .update({ locked_until: newTime })
        .eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lock_state'] }),
  })

  const requestShortening = useMutation({
    mutationFn: async () => {
      if (!shorteningTo) throw new Error('Pick a target time')
      const target = new Date(shorteningTo).toISOString()
      const { error } = await supabase.from('unlock_requests').insert({
        target_lock_change: { new_locked_until: target },
        requested_by:       user!.id,
        status:             'pending',
        reason:             shortenReason.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unlock_requests'] })
      setShorteningTo('')
      setShortenReason('')
      setShowShortenForm(false)
    },
  })

  const minShortenInput = new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 16) // at least 1h from now
  const maxShortenInput = current ? current.toISOString().slice(0, 16) : minShortenInput

  return (
    <div className="flex flex-col gap-6">
      <div>
        <MicroLabel>Extend (instant)</MicroLabel>
        <div className="flex flex-wrap gap-2">
          {QUICK_EXTENSIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => extend.mutate(opt.days)}
              disabled={extend.isPending}
              className="text-small text-ink-muted border border-rule hover:border-ink hover:text-ink px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
        {extend.error && (
          <p className="text-small text-oxblood mt-3" role="alert">
            {(extend.error as Error).message}
          </p>
        )}
      </div>

      {current && current.getTime() > Date.now() && (
        <div className="border-t border-rule pt-6">
          <MicroLabel>Shorten (requires approval)</MicroLabel>
          {!showShortenForm ? (
            <button
              onClick={() => setShowShortenForm(true)}
              className="text-small text-ink-muted hover:text-ink border-b border-rule hover:border-ink pb-1 transition-colors"
            >
              Request shorter lock…
            </button>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span
                  className="text-micro text-ink-faint uppercase"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Shorten to
                </span>
                <input
                  type="datetime-local"
                  min={minShortenInput}
                  max={maxShortenInput}
                  value={shorteningTo}
                  onChange={e => setShorteningTo(e.target.value)}
                  className="bg-transparent border-b border-rule focus:border-ink focus:outline-none py-2 text-body text-ink transition-colors"
                />
              </label>
              <textarea
                rows={2}
                placeholder="Reason (optional)"
                value={shortenReason}
                onChange={e => setShortenReason(e.target.value)}
                className="bg-transparent border border-rule focus:border-ink focus:outline-none px-3 py-2 text-small text-ink placeholder:text-ink-faint resize-none transition-colors"
              />
              {requestShortening.error && (
                <p className="text-small text-oxblood" role="alert">
                  {(requestShortening.error as Error).message}
                </p>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowShortenForm(false); setShorteningTo(''); setShortenReason('') }}
                  disabled={requestShortening.isPending}
                  className="text-small text-ink-muted hover:text-ink px-3 py-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => requestShortening.mutate()}
                  disabled={!shorteningTo || requestShortening.isPending}
                  className="bg-oxblood text-paper hover:bg-oxblood-hover disabled:opacity-50 px-4 py-2 text-small font-medium transition-colors"
                >
                  {requestShortening.isPending ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
              {shorteningTo && (
                <p className="text-small text-ink-faint">
                  If approved, the lock shortens to {new Date(shorteningTo).toLocaleString()} — taking effect {formatCountdown(new Date(Date.now() + lockState.cooling_off_hours * 3_600_000).toISOString())} after your friend approves.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
