import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isRealSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export let supabase: SupabaseClient<Database>;

if (isRealSupabaseConfigured) {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  // Graceful fallback dummy client if environment variables are not yet injected
  supabase = createClient<Database>(
    'https://placeholder-hireslot.supabase.co',
    'placeholder-anon-key'
  );
}

export function getSupabase(): SupabaseClient<Database> {
  return supabase;
}

