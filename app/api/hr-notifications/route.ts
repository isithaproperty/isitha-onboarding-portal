import { NextResponse } from 'next/server';
import { canViewHr } from '@/lib/authz';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canViewHr(role)) return NextResponse.json({ error: 'HR access is required.' }, { status: 403 });

    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === '1';
    const admin = createSupabaseAdminClient();
    let query = admin.from('hr_notifications')
      .select('id,event_type,title,message,action_path,email_status,email_recipients,created_at,read_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (unreadOnly) query = query.is('read_at', null);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ notifications: data || [], unreadCount: (data || []).filter(item => !item.read_at).length });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load HR notifications.') }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canViewHr(role)) return NextResponse.json({ error: 'HR access is required.' }, { status: 403 });

    const body = await request.json() as { id?: string; markAllRead?: boolean };
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();

    if (body.markAllRead) {
      const { error } = await admin.from('hr_notifications').update({ read_at: now, read_by: user.id }).is('read_at', null);
      if (error) throw error;
      return NextResponse.json({ updated: true });
    }

    if (!body.id) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    const { error } = await admin.from('hr_notifications').update({ read_at: now, read_by: user.id }).eq('id', body.id);
    if (error) throw error;
    return NextResponse.json({ updated: true });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to update HR notification.') }, { status: 500 });
  }
}
