import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Cliente Supabase con service_role key.
 * Bypassa Row Level Security — usar SOLO en el servidor para datos públicos
 * que el anon key no puede leer por restricciones de RLS.
 * NUNCA exponer al cliente ni usar en rutas protegidas como sustituto de auth.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
