import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfigState } from '../types';

const STORAGE_KEY_CONFIG = 'hireslot_candidate_supabase_config';

export const getSavedSupabaseConfig = (): SupabaseConfigState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading saved Supabase config:', e);
  }

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    supabaseUrl: envUrl || 'https://demo-candidate.supabase.co',
    supabaseAnonKey: envKey || 'demo-candidate-anon-key',
    isConnected: false,
    isCustomConnected: Boolean(envUrl && envKey),
    lastCheckedAt: undefined
  };
};

export const saveSupabaseConfig = (config: Partial<SupabaseConfigState>): SupabaseConfigState => {
  const current = getSavedSupabaseConfig();
  const updated: SupabaseConfigState = {
    ...current,
    ...config,
    lastCheckedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
  return updated;
};

let currentClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  const config = getSavedSupabaseConfig();
  const validUrl = config.supabaseUrl?.startsWith('http')
    ? config.supabaseUrl
    : 'https://demo-candidate.supabase.co';
  const validKey = config.supabaseAnonKey || 'demo-candidate-anon-key';

  if (!currentClient) {
    currentClient = createClient(validUrl, validKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }
  return currentClient;
};

export const resetSupabaseClient = () => {
  currentClient = null;
};

export const testSupabaseConnection = async (
  url: string,
  key: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!url || !key) {
      return { success: false, message: 'URL and Anon Key are required.' };
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return { success: false, message: 'Invalid URL. Must begin with https:// or http://' };
    }

    const testClient = createClient(url, key);
    const { data, error } = await testClient.from('candidates').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "candidates" does not exist')) {
        return {
          success: true,
          message: 'Connected to Supabase project! Note: Schema tables not yet executed. Run schema.sql in Supabase SQL editor.'
        };
      }
      return {
        success: false,
        message: `Supabase returned: ${error.message} (Code: ${error.code})`
      };
    }

    return {
      success: true,
      message: 'Verified live Supabase database connection and candidate tables!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to establish connection to Supabase.'
    };
  }
};

export const LocalSync = {
  get: <T>(key: string, defaultData: T): T => {
    try {
      const item = localStorage.getItem(`hireslot_cand_${key}`);
      return item ? JSON.parse(item) : defaultData;
    } catch {
      return defaultData;
    }
  },
  set: <T>(key: string, data: T): void => {
    try {
      localStorage.setItem(`hireslot_cand_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn(`LocalStorage write error on key ${key}:`, e);
    }
  }
};

