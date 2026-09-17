import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only code that must bypass RLS — e.g.
 * reading another user's stored kakao_tokens row to send them a
 * notification. Never import this from a Client Component; the service
 * role key must never reach the browser.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
