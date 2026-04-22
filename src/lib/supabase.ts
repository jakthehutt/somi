import { createClient } from '@supabase/supabase-js'

const url  = (import.meta.env.VITE_SUPABASE_URL as string)  || 'https://ctcpjumkyxcgskmqrrpv.supabase.co'
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

export const missingEnvVars = !anon
  ? 'VITE_SUPABASE_ANON_KEY is not set. On Vercel: Settings → Environment Variables. Add it for Production, then redeploy.'
  : null

// If the anon key is missing we still export a client (with an empty key).
// Any request will fail with a clear 401; the app shell renders a banner instead of a blank page.
export const supabase = createClient(url, anon || 'missing')
