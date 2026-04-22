import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { missingEnvVars } from './lib/supabase'

import Login           from './pages/Login'
import Dashboard       from './pages/Dashboard'
import FriendDashboard from './pages/FriendDashboard'
import AuditLog        from './pages/AuditLog'
import Unauthorized    from './pages/Unauthorized'
import RequireRole     from './components/RequireRole'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function EnvError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-lg">
      <div className="max-w-lg bg-paper-raised border border-rule p-xl">
        <h1 className="text-h2 font-display text-oxblood mb-sm">Configuration error</h1>
        <p className="text-body text-ink mb-md">{message}</p>
        <p className="text-small text-ink-muted">
          On Vercel: Settings → Environment Variables — add the missing{' '}
          <code className="bg-paper-sunken px-xs py-2xs">VITE_*</code> keys, then redeploy.
        </p>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {missingEnvVars ? (
      <EnvError message={missingEnvVars} />
    ) : (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login"        element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/friend" element={
              <RequireRole role="friend">
                <FriendDashboard />
              </RequireRole>
            } />
            <Route path="/log" element={
              <RequireRole role="owner">
                <AuditLog />
              </RequireRole>
            } />
            <Route path="/" element={
              <RequireRole role="owner">
                <Dashboard />
              </RequireRole>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    )}
  </StrictMode>
)
