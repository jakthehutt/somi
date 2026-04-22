import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LockState } from '../lib/types'

export function useLockState() {
  return useQuery<LockState>({
    queryKey: ['lock_state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lock_state')
        .select('*')
        .eq('id', 1)
        .single()
      if (error) throw error
      return data
    },
  })
}
