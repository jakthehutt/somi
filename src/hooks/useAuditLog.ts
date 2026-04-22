import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { AuditEntry } from '../lib/types'

export function useAuditLog(actionPrefix?: string, limit = 100) {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit_log', actionPrefix, limit],
    queryFn: async () => {
      let q = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (actionPrefix) q = q.like('action', `${actionPrefix}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
