import { useAuth } from '../hooks/useAuth'

export default function Unauthorized() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
        <p className="text-gray-500 text-sm mb-4">
          Your account does not have access to this page.
        </p>
        <button
          onClick={signOut}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
