import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Wordmark } from '../components/Wordmark'

export default function Login() {
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-md py-16">
        <div className="mb-2">
          <Wordmark as="h1" size="display" />
        </div>
        <p className="text-body text-ink-muted mb-12" style={{ maxWidth: '28ch' }}>
          A pact is in force. Sign in to read it.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-1">
            <span className="text-micro font-body text-ink-muted uppercase" style={{ letterSpacing: '0.12em' }}>
              Email
            </span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-transparent border-b border-rule focus:border-ink focus:outline-none py-2 text-body text-ink placeholder:text-ink-faint transition-colors"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-micro font-body text-ink-muted uppercase" style={{ letterSpacing: '0.12em' }}>
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-transparent border-b border-rule focus:border-ink focus:outline-none py-2 text-body text-ink transition-colors"
            />
          </label>

          {error && (
            <p className="text-small text-oxblood" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 self-start bg-oxblood text-paper hover:bg-oxblood-hover disabled:opacity-50 px-6 py-3 text-small font-medium transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
