import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { BlocklistEntry } from '../lib/types'

export function useBlocklist() {
  return useQuery<BlocklistEntry[]>({
    queryKey: ['blocklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocklist')
        .select('*')
        .neq('status', 'removed')
        .order('added_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
