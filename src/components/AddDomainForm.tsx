import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from '../hooks/useAuth'

// Basic domain validation: no protocol, no path, no spaces.
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-xs">
      <div className="flex gap-sm items-stretch">
        <input
          type="text"
          placeholder="reddit.com"
          value={input}
          onChange={e => { setInput(e.target.value); setValidationError(null) }}
          className="flex-1 bg-transparent border-b border-rule focus:border-ink focus:outline-none py-xs text-body font-mono text-ink placeholder:text-ink-faint transition-colors"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="bg-oxblood text-paper hover:bg-oxblood-hover disabled:opacity-50 px-md text-small font-medium transition-colors"
        >
          {mutation.isPending ? 'Adding…' : 'Block'}
        </button>
      </div>
      {error && <p className="text-small text-oxblood" role="alert">{error}</p>}
      {mutation.isSuccess && (
        <p className="text-small text-sage">Domain blocked. NextDNS updates within ~30 s.</p>
      )}
    </form>
  )
}
