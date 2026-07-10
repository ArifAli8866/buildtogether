import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Admin client with service role key (for server-side operations)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client with anon key (for user-scoped operations)
export const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Helper to create authenticated client
export const createAuthenticatedClient = (accessToken: string) => {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
