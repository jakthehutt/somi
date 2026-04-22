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
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Extend lock (instant)</h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_EXTENSIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => extend.mutate(opt.days)}
              disabled={extend.isPending}
              className="text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
        {extend.error && (
          <p className="text-red-600 text-xs mt-2">{(extend.error as Error).message}</p>
        )}
      </div>

      {current && current.getTime() > Date.now() && (
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Shorten lock (requires approval)
          </h3>
          {!showShortenForm ? (
            <button
              onClick={() => setShowShortenForm(true)}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Request shorter lock…
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">
                Shorten to
                <input
                  type="datetime-local"
                  min={minShortenInput}
                  max={maxShortenInput}
                  value={shorteningTo}
                  onChange={e => setShorteningTo(e.target.value)}
                  className="block mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </label>
              <textarea
                rows={2}
                placeholder="Reason (optional)"
                value={shortenReason}
                onChange={e => setShortenReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
              {requestShortening.error && (
                <p className="text-red-600 text-xs">{(requestShortening.error as Error).message}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowShortenForm(false); setShorteningTo(''); setShortenReason('') }}
                  disabled={requestShortening.isPending}
                  className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => requestShortening.mutate()}
                  disabled={!shorteningTo || requestShortening.isPending}
                  className="bg-gray-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {requestShortening.isPending ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
              {shorteningTo && (
                <p className="text-xs text-gray-400">
                  If approved, lock shortens to {new Date(shorteningTo).toLocaleString()} — takes effect {formatCountdown(new Date(Date.now() + lockState.cooling_off_hours * 3_600_000).toISOString())} after friend approval.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
