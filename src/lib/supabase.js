import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  const missing = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnon ? 'VITE_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean).join(', ')
  console.error(`[Supabase] Missing required env vars: ${missing}. Check .env`)
  throw new Error('Supabase client initialization failed: missing required VITE_ environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})
