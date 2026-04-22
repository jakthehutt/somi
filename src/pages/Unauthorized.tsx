import { useAuth } from '../hooks/useAuth'

export default function Unauthorized() {
  const { user, profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-lg">
      <div className="w-full max-w-md py-3xl">
        <h1
          className="text-h2 font-display text-ink mb-sm"
          style={{ letterSpacing: '-0.015em' }}
        >
          Not this door
        </h1>
        <p className="text-body text-ink-muted mb-lg">
          You're signed in, but this page isn't for your role.
        </p>

        <dl className="flex flex-col gap-xs text-small mb-xl">
          <div className="flex gap-sm">
            <dt
              className="text-micro text-ink-faint uppercase w-20 shrink-0 pt-2xs"
              style={{ letterSpacing: '0.12em' }}
            >
              Email
            </dt>
            <dd className="text-ink font-mono">{user?.email ?? 'unknown'}</dd>
          </div>
          <div className="flex gap-sm">
            <dt
              className="text-micro text-ink-faint uppercase w-20 shrink-0 pt-2xs"
              style={{ letterSpacing: '0.12em' }}
            >
              Role
            </dt>
            <dd className="text-ink">{profile?.role ?? 'no profile found'}</dd>
          </div>
        </dl>

        <button
          onClick={signOut}
          className="text-small text-ink-muted hover:text-ink border-b border-rule hover:border-ink pb-2xs transition-colors"
        >
          Sign out and try again
        </button>
      </div>
    </div>
  )
}
