import 'server-only';

import { normaliseRole } from '@/lib/authz';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

type NotificationInput = {
  eventKey: string;
  eventType: 'onboarding_completed' | 'appraisal_completed' | 'probation_completed' | 'training_renewal_due' | 'appraisal_renewal_due';
  entityId?: string | null;
  employeeId?: string | null;
  title: string;
  message: string;
  actionPath: string;
};

function configuredRecipients() {
  return (process.env.HR_NOTIFICATION_EMAIL || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

async function resolveRecipients() {
  const configured = configuredRecipients();
  if (configured.length) return configured;

  const admin = createSupabaseAdminClient();
  const recipients: string[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (!user.email) continue;
      if (normaliseRole(user.app_metadata?.role) === 'hr_admin') recipients.push(user.email.toLowerCase());
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return [...new Set(recipients)];
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character));
}

export async function createHrCompletionNotification(input: NotificationInput) {
  const admin = createSupabaseAdminClient();
  const { data: notification, error: insertError } = await admin.from('hr_notifications').insert({
    event_key: input.eventKey,
    event_type: input.eventType,
    entity_id: input.entityId || null,
    employee_id: input.employeeId || null,
    title: input.title,
    message: input.message,
    action_path: input.actionPath,
    email_status: 'pending',
  }).select('id').single();

  if (insertError) {
    if (insertError.code === '23505') return { duplicate: true, emailStatus: 'already_recorded' as const };
    throw insertError;
  }

  let recipients: string[] = [];
  try {
    recipients = await resolveRecipients();
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFICATION_FROM_EMAIL;
    const appUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/, '');

    if (!apiKey || !from || !recipients.length) {
      await admin.from('hr_notifications').update({
        email_status: 'configuration_required',
        email_recipients: recipients,
        email_error: !apiKey ? 'RESEND_API_KEY is not configured.' : !from ? 'NOTIFICATION_FROM_EMAIL is not configured.' : 'No HR notification recipient is configured.',
      }).eq('id', notification.id);
      return { duplicate: false, emailStatus: 'configuration_required' as const };
    }

    const actionUrl = appUrl ? `${appUrl}${input.actionPath}` : '';
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>${escapeHtml(input.title)}</h2><p>${escapeHtml(input.message)}</p>${actionUrl ? `<p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open Isitha Portal</a></p>` : ''}<p style="color:#6b7280;font-size:13px">This is an automatic notification from the Isitha Global Staff Portal.</p></div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: recipients, subject: input.title, html }),
    });

    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 500);
      await admin.from('hr_notifications').update({ email_status: 'failed', email_recipients: recipients, email_error: responseText || `Email provider returned ${response.status}.` }).eq('id', notification.id);
      return { duplicate: false, emailStatus: 'failed' as const };
    }

    await admin.from('hr_notifications').update({ email_status: 'sent', email_recipients: recipients, email_error: null }).eq('id', notification.id);
    return { duplicate: false, emailStatus: 'sent' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Unable to send HR notification email.';
    await admin.from('hr_notifications').update({ email_status: 'failed', email_recipients: recipients, email_error: message }).eq('id', notification.id);
    return { duplicate: false, emailStatus: 'failed' as const };
  }
}
