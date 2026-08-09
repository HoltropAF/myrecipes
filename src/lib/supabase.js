import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// `%` and `_` are wildcards in an ILIKE pattern. An ingredient called
// "100% pure cocoa" would otherwise match far more rows than intended.
export function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, m => `\\${m}`)
}
