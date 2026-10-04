import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-side Supabase client using public environment variables.
 * Safe for use in React Client Components.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    );
  }

  return createBrowserClient(url, anonKey);
}
