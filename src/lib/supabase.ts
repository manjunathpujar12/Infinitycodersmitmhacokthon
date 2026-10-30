import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Create Supabase client if credentials exist, otherwise a placeholder client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    })
  : null;

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase credentials not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).'
    };
  }

  const start = performance.now();
  try {
    const { error } = await supabase.from('profiles').select('id', { head: true }).limit(1);
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return { success: false, message: `Connected to Supabase but query failed: ${error.message}`, latencyMs };
    }
    return { success: true, message: `Successfully connected to HireSlot profiles (${latencyMs}ms)`, latencyMs };
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message || 'Unknown network error'}` };
  }
}
