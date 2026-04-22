import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL as string ?? 'https://ctcpjumkyxcgskmqrrpv.supabase.co'
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY is not set')

export const supabase = createClient(url, anon)
