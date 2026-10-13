import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/lib/env";

/**
 * Constructs a Supabase database client that carries the active Clerk signed-in token.
 * 
 * - Identity provider (Clerk) owns sessions; no secondary cookie or refresh session loop is used.
 * - If a custom "supabase" JWT template exists in Clerk, it is used; otherwise the standard Clerk token is attached.
 * - Access policies in Postgres read organization and user claims directly off the JWT.
 */
export async function createServerClient() {
  const { getToken } = await auth();

  // Try custom template if configured, otherwise fallback to default session token
  const token =
    (await getToken({ template: "supabase" }).catch(() => null)) ??
    (await getToken());

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
