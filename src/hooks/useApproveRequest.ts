import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from './useAuth'

export function useApproveRequest() {
  const { user } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string, approve: boolean }) => {
      const payload = approve
        ? { status: 'approved' as const, approved_at: new Date().toISOString(), friend_user_id: user!.id }
        : { status: 'denied'   as const, friend_user_id: user!.id }

      const { error } = await supabase
        .from('unlock_requests')
        .update(payload)
        .eq('id', requestId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unlock_requests'] })
    },
  })
}
