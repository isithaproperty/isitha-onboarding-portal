import 'server-only';

import type { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function resolveEmployeeForUser(user: User) {
  const admin = createSupabaseAdminClient();
  const linked = await admin.from('employees').select('id,manager_id').eq('auth_user_id', user.id).maybeSingle();
  if (linked.error) throw linked.error;
  if (linked.data) return linked.data;
  if (!user.email) return null;

  const byEmail = await admin.from('employees').select('id,manager_id,auth_user_id').ilike('email', user.email).maybeSingle();
  if (byEmail.error) throw byEmail.error;
  if (!byEmail.data || (byEmail.data.auth_user_id && byEmail.data.auth_user_id !== user.id)) return null;

  const repaired = await admin.from('employees')
    .update({ auth_user_id: user.id })
    .eq('id', byEmail.data.id)
    .is('auth_user_id', null)
    .select('id,manager_id')
    .maybeSingle();
  if (repaired.error) throw repaired.error;
  return repaired.data;
}
