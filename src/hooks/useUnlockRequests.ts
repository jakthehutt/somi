import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { UnlockRequest, RequestStatus } from '../lib/types'

type Filter = 'pending' | 'active' | 'all'

/**
 * filter = 'pending' → only status='pending'
 * filter = 'active'  → pending OR approved (not yet executed)
 * filter = 'all'     → everything
 */
export function useUnlockRequests(filter?: Filter) {
  return useQuery<UnlockRequest[]>({
    queryKey: ['unlock_requests', filter],
    queryFn: async () => {
      let q = supabase
        .from('unlock_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      if (filter === 'pending') {
        q = q.eq('status', 'pending' satisfies RequestStatus)
      } else if (filter === 'active') {
        q = q.in('status', ['pending', 'approved'] satisfies RequestStatus[])
      }
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    refetchInterval: filter === 'active' || filter === 'pending' ? 30_000 : false,
  })
}
