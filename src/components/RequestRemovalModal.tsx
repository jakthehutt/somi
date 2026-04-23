import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../hooks/useAuth'
import type { BlocklistEntry } from '../lib/types'

interface Props {
  entry: BlocklistEntry
  onClose: () => void
}

export default function RequestRemovalModal({ entry, onClose }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('unlock_requests').insert({
        target_blocklist_id: entry.id,
        requested_by:         user!.id,
        status:               'pending',
        reason:               reason.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unlock_requests'] })
      qc.invalidateQueries({ queryKey: ['blocklist'] })
      onClose()
    },
  })

  const error = mutation.error ? (mutation.error as Error).message : null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6 z-50"
      style={{ backgroundColor: 'oklch(0.22 0.012 60 / 0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="removal-title"
    >
      <div
        className="bg-paper-raised border border-rule max-w-md w-full p-8"
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="removal-title"
          className="text-h2 font-display text-ink mb-3"
          style={{ letterSpacing: '-0.015em' }}
        >
          Request removal
        </h2>
        <p className="text-body text-ink-muted mb-6" style={{ maxWidth: '48ch' }}>
          Asking your friend to approve unblocking{' '}
          <span className="font-mono text-ink">{entry.domain}</span>. If approved, the block is removed after the cooling-off delay.
        </p>

        <label className="flex flex-col gap-1 mb-4">
          <span
            className="text-micro text-ink-muted uppercase"
            style={{ letterSpacing: '0.12em' }}
          >
            Reason (optional)
          </span>
          <textarea
            rows={3}
            placeholder="Why do you need this unblocked?"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="bg-transparent border border-rule focus:border-ink focus:outline-none px-3 py-2 text-body text-ink placeholder:text-ink-faint resize-none transition-colors"
          />
        </label>

        {error && <p className="text-small text-oxblood mb-3" role="alert">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-small text-ink-muted hover:text-ink px-3 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-oxblood text-paper hover:bg-oxblood-hover disabled:opacity-50 px-4 py-2 text-small font-medium transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  )
}
