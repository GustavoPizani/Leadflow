/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, createMockBrowserClient } from './mock-auth';

export function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockBrowserClient() as any;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
