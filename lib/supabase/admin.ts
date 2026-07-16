import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client com a service_role key — só usar server-side (server actions/route
 * handlers), NUNCA importar em código de client component. Único uso deste
 * projeto: criar contas novas (gestor/corretor) via Admin API, desvinculadas
 * da tabela `users` do CRM.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
