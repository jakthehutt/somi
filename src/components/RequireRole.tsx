import { Navigate } from 'react-router-dom'
import { useAuth }  from '../hooks/useAuth'
import type { Role } from '../lib/types'

interface Props {
  role: Role
  children: React.ReactNode
}

export default function RequireRole({ role, children }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // If they're logged in but wrong role, route them to their home — not unauthorized
  if (profile?.role && profile.role !== role) {
    const destination = profile.role === 'owner' ? '/' : '/friend'
    return <Navigate to={destination} replace />
  }

  // Profile hasn't loaded yet but user is authenticated → show loading rather than deny
  if (!profile) return <Navigate to="/unauthorized" replace />

  return <>{children}</>
}
