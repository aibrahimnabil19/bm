import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This check prevents the build from crashing if keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials are missing. Check your environment variables.")
}

export const supabase = createBrowserClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
)