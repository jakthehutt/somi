import { useAuth } from '../hooks/useAuth'

export default function Unauthorized() {
  const { user, profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
        <p className="text-gray-700 text-sm font-medium mb-2">Access denied</p>
        <p className="text-gray-400 text-xs mb-4">
          Signed in as: {user?.email ?? 'unknown'}<br />
          Profile role: {profile?.role ?? '(no profile found)'}
        </p>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out and try again
        </button>
      </div>
    </div>
  )
}
