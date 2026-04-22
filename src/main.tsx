import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { missingEnvVars } from './lib/supabase'

import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Unauthorized from './pages/Unauthorized'
import RequireRole  from './components/RequireRole'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

function EnvError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-lg bg-white border border-red-200 rounded-xl p-6">
        <h1 className="text-lg font-semibold text-red-700 mb-2">Configuration error</h1>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <p className="text-xs text-gray-500">
          If you see this on Vercel, go to your project Settings → Environment Variables
          and add the missing <code className="bg-gray-100 px-1 rounded">VITE_*</code> keys,
          then redeploy.
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
