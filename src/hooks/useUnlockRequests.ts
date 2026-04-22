import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnlockRequest } from '../lib/types'

export function useUnlockRequests(filter?: 'pending' | 'all') {
  return useQuery<UnlockRequest[]>({
    queryKey: ['unlock_requests', filter],
    queryFn: async () => {
      let q = supabase
        .from('unlock_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      if (filter === 'pending') q = q.eq('status', 'pending')
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
