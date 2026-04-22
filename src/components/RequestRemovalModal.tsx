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
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Request removal</h2>
        <p className="text-sm text-gray-500 mb-4">
          Asking your friend to approve unblocking{' '}
          <span className="font-mono text-gray-800">{entry.domain}</span>.
          They will see this request and can approve or deny.
          If approved, the block is removed after the cooling-off delay.
        </p>

        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Reason (optional)
        </label>
        <textarea
          rows={3}
          placeholder="Why do you need this unblocked?"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
        />

        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-gray-900 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  )
}
