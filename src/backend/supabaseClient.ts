import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * HireSlot Backend Supabase Client Configuration
 *
 * CRITICAL SECURITY RULES:
 * 1. NEVER expose SUPABASE_SERVICE_ROLE_KEY to client/browser applications.
 * 2. Authenticated user actions must use the standard ANON_KEY paired with the user's JWT session.
 * 3. Row Level Security (RLS) and PostgreSQL database functions enforce permissions server-side.
 */

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey?: string;
}

/**
 * Creates an authenticated Supabase client for a given user JWT token.
 * This client respects Row Level Security (RLS) based on the user's role and auth.uid().
 */
export function createUserClient(
  jwtToken: string,
  config: SupabaseConfig = {
    supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
  }
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    },
  });
}

/**
 * Creates a server-only administrative client using the service role key.
 * Used ONLY in trusted backend workers or migration scripts.
 */
export function createAdminClient(
  config: SupabaseConfig = {
    supabaseUrl: process.env.SUPABASE_URL || 'https://example.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'mock-anon-key',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
): SupabaseClient {
  const serviceKey = config.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client initialization.');
  }

  return createClient(config.supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
