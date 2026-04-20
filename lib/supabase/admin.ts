/**
 * Supabase ADMIN client — usa service_role_key, BYPASS RLS.
 * USAR APENAS em:
 *   - Edge Functions
 *   - Webhooks
 *   - Server Actions críticas (com checagem manual de permissão)
 *
 * NUNCA importar em Client Components.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
