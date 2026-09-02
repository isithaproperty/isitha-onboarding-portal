import { NextResponse } from 'next/server';
import { canManageAppraisals } from '@/lib/authz';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { getAuthenticatedUser, roleForUser, safeApiError } from '@/lib/server-auth';

type AppraisalBody = Record<string, unknown>;

const RATING_FIELDS = [
  'performance_rating','quality_rating','communication_rating','teamwork_rating',
  'reliability_rating','initiative_rating','leadership_rating','overall_rating',
] as const;

function cleanText(value: unknown) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text || null;
}

function cleanDate(value: unknown) {
  const text = cleanText(value);
  return text && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanRating(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
}

function canAdministerAppraisals(role: ReturnType<typeof roleForUser>) {
  return role === 'hr_admin' || role === 'admin';
}

async function authorisedEmployees(userId: string, role: ReturnType<typeof roleForUser>) {
  const admin = createSupabaseAdminClient();
  let query = admin.from('employees')
    .select('id,first_name,last_name,email,job_title,client_name,manager_id,onboarding_status')
    .or('onboarding_status.is.null,onboarding_status.neq.leaver')
    .order('first_name');
  if (role === 'manager') query = query.eq('manager_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canManageAppraisals(role)) return NextResponse.json({ error: 'Appraisals are only available to Managers and HR.' }, { status: 403 });

    const employees = await authorisedEmployees(user.id, role);
    const employeeIds = employees.map(employee => employee.id);
    if (!employeeIds.length) return NextResponse.json({ employees, appraisals: [], canAdminister: canAdministerAppraisals(role) });

    const admin = createSupabaseAdminClient();
    const { data: appraisals, error } = await admin.from('appraisals')
      .select('*')
      .in('employee_id', employeeIds)
      .order('review_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ employees, appraisals: appraisals || [], canAdminister: canAdministerAppraisals(role) });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to load appraisals.') }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canManageAppraisals(role)) return NextResponse.json({ error: 'Appraisals are only available to Managers and HR.' }, { status: 403 });

    const body = await request.json() as AppraisalBody;
    const employeeId = cleanText(body.employee_id);
    if (!employeeId) return NextResponse.json({ error: 'Select an employee.' }, { status: 400 });

    const employees = await authorisedEmployees(user.id, role);
    if (!employees.some(employee => employee.id === employeeId)) {
      return NextResponse.json({ error: 'You are not authorised to appraise this employee.' }, { status: 403 });
    }

    const reviewDate = cleanDate(body.review_date);
    const periodStart = cleanDate(body.review_period_start);
    const periodEnd = cleanDate(body.review_period_end);
    if (!reviewDate || !periodStart || !periodEnd) return NextResponse.json({ error: 'Review date and review period are required.' }, { status: 400 });
    if (periodEnd < periodStart) return NextResponse.json({ error: 'Review period end date cannot be before the start date.' }, { status: 400 });

    const status = cleanText(body.status) === 'completed' ? 'completed' : 'draft';
    const appraisalType = ['annual','probation','quarterly','mid_year','other'].includes(String(body.appraisal_type)) ? String(body.appraisal_type) : 'annual';

    const payload: Record<string, unknown> = {
      employee_id: employeeId,
      reviewer_user_id: user.id,
      review_date: reviewDate,
      review_period_start: periodStart,
      review_period_end: periodEnd,
      appraisal_type: appraisalType,
      status,
      achievements: cleanText(body.achievements),
      objectives_review: cleanText(body.objectives_review),
      strengths: cleanText(body.strengths),
      improvement_areas: cleanText(body.improvement_areas),
      attendance_comments: cleanText(body.attendance_comments),
      conduct_comments: cleanText(body.conduct_comments),
      training_development: cleanText(body.training_development),
      career_goals: cleanText(body.career_goals),
      future_objectives: cleanText(body.future_objectives),
      manager_comments: cleanText(body.manager_comments),
      employee_comments: cleanText(body.employee_comments),
      hr_comments: cleanText(body.hr_comments),
      action_plan: cleanText(body.action_plan),
      next_review_date: cleanDate(body.next_review_date),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    for (const field of RATING_FIELDS) payload[field] = cleanRating(body[field]);

    const admin = createSupabaseAdminClient();
    const appraisalId = cleanText(body.id);
    if (appraisalId) {
      const { data: existing, error: existingError } = await admin.from('appraisals').select('id,employee_id').eq('id', appraisalId).maybeSingle();
      if (existingError) throw existingError;
      if (!existing || !employees.some(employee => employee.id === existing.employee_id)) {
        return NextResponse.json({ error: 'Appraisal not found or access denied.' }, { status: 404 });
      }
      const { data, error } = await admin.from('appraisals').update(payload).eq('id', appraisalId).select('*').single();
      if (error) throw error;
      return NextResponse.json({ appraisal: data });
    }

    payload.created_by = user.id;
    const { data, error } = await admin.from('appraisals').insert(payload).select('*').single();
    if (error) throw error;
    return NextResponse.json({ appraisal: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to save this appraisal.') }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const role = roleForUser(user);
    if (!canAdministerAppraisals(role)) return NextResponse.json({ error: 'Only HR and Admin can delete appraisals or probation reviews.' }, { status: 403 });

    const url = new URL(request.url);
    const appraisalId = cleanText(url.searchParams.get('id'));
    if (!appraisalId) return NextResponse.json({ error: 'Review ID is required.' }, { status: 400 });

    const admin = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await admin.from('appraisals').select('id').eq('id', appraisalId).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });

    const { error } = await admin.from('appraisals').delete().eq('id', appraisalId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'Unable to delete this review.') }, { status: 500 });
  }
}
