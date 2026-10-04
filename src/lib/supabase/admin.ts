import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a privileged Supabase client with the service-role key.
 *
 * CRITICAL SECURITY INVARIANT:
 * - NEVER import or execute this on the client side.
 * - Used strictly for background webhooks and serverless administrative tasks.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must NEVER be called in the browser!');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client.'
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
