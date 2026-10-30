import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfigState } from '../types';

// Production credentials are supplied only through Vite environment variables.
// Never persist Supabase keys in browser localStorage.
const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env ?? {};
const envUrl = env.VITE_SUPABASE_URL ?? '';
const envKey = env.VITE_SUPABASE_ANON_KEY ?? '';

export const getSavedSupabaseConfig = (): SupabaseConfigState => ({
  supabaseUrl: envUrl,
  supabaseAnonKey: envKey,
  isConnected: Boolean(envUrl && envKey),
  isCustomConnected: false,
});

export const saveSupabaseConfig = (config: Partial<SupabaseConfigState>): SupabaseConfigState => ({
  ...getSavedSupabaseConfig(),
  ...config,
  // Environment values are authoritative; a browser setting cannot override them.
  supabaseUrl: envUrl,
  supabaseAnonKey: envKey,
  lastCheckedAt: new Date().toISOString(),
});

let currentClient: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(envUrl && envKey);

export const getSupabaseClient = (): SupabaseClient => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before starting the app.');
  }
  if (!currentClient) {
    currentClient = createClient(envUrl, envKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return currentClient;
};

export const resetSupabaseClient = (): void => {
  currentClient = null;
};

export const testSupabaseConnection = async (
  url: string,
  key: string
): Promise<{ success: boolean; message: string }> => {
  if (!url || !key) return { success: false, message: 'URL and publishable/anon key are required.' };
  if (!url.startsWith('https://')) return { success: false, message: 'Supabase URL must use HTTPS.' };
  try {
    const client = createClient(url, key);
    const { error } = await client.from('profiles').select('id').limit(1);
    if (error) return { success: false, message: `Supabase connection check failed: ${error.message}` };
    return { success: true, message: 'Connected to the HireSlot profiles table.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unable to connect to Supabase.' };
  }
};

// LocalSync is retained only for non-sensitive, temporary UI preferences.
// Authentication, identity and candidate records must never use it.
export const LocalSync = {
  get: <T>(key: string, defaultData: T): T => {
    try {
      const item = localStorage.getItem(`hireslot_cand_${key}`);
      return item ? JSON.parse(item) as T : defaultData;
    } catch {
      return defaultData;
    }
  },
  set: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(`hireslot_cand_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn(`Local UI preference write failed for ${key}:`, error);
    }
  },
};
