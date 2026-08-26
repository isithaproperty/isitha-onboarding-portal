import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { normaliseRole, type PortalRole } from '@/lib/authz';

function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing = [!url && 'NEXT_PUBLIC_SUPABASE_URL', !key && 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'].filter(Boolean);
  if (missing.length) throw new Error(`Missing required server configuration: ${missing.join(', ')}.`);
  return { url: url!, key: key! };
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const { url, key } = publicSupabaseConfig();
  const client = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}

export function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
}

export function roleForUser(user: User): PortalRole {
  if (user.email && configuredAdminEmails().includes(user.email.toLowerCase())) return 'admin';
  return normaliseRole(user.app_metadata?.role);
}

export function safeApiError(error: unknown, fallback: string) {
  if (process.env.NODE_ENV !== 'production') console.error(error);
  return fallback;
}
