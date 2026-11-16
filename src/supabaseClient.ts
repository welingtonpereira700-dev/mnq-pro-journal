import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ccsxpkfbzhnymcscrvoq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PAXrmZKxJ2Zcy2ZL8gUQOg_5bzy_HOB'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
