import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../hooks/useAuth'

// Basic domain validation: no protocol, no path, no spaces
const DOMAIN_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

function normalizeDomain(raw: string) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]
}

export default function AddDomainForm() {
  const { user }       = useAuth()
  const queryClient    = useQueryClient()
  const [input, setInput] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (domain: string) => {
      const { error } = await supabase.from('blocklist').insert({
        domain,
        added_by: user!.id,
        status: 'active',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocklist'] })
      setInput('')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    const domain = normalizeDomain(input)
    if (!DOMAIN_RE.test(domain)) {
      setValidationError('Enter a valid domain, e.g. reddit.com')
      return
    }
    mutation.mutate(domain)
  }

  const error = validationError ?? (mutation.error ? (mutation.error as Error).message : null)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="reddit.com"
          value={input}
          onChange={e => { setInput(e.target.value); setValidationError(null) }}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? 'Adding…' : 'Block'}
        </button>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      {mutation.isSuccess && (
        <p className="text-green-600 text-xs">Domain blocked. NextDNS will update within ~30 s.</p>
      )}
    </form>
  )
}
