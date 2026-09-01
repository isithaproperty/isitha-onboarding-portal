import { NextResponse } from 'next/server';
import { complianceAssessments } from '@/lib/compliance-assessments';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { resolveEmployeeForUser } from '@/lib/employee-link';
import { getAuthenticatedUser, safeApiError } from '@/lib/server-auth';

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const assessment = complianceAssessments[slug];
    if (!assessment) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });

    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    const employee = await resolveEmployeeForUser(user);
    if (!employee) return NextResponse.json({ error: 'Your employee profile is not linked. Please contact HR.' }, { status: 409 });

    const body = await request.json() as { answers?: unknown[] };
    const answers = Array.isArray(body.answers) ? body.answers : [];
    if (answers.length !== assessment.questions.length || answers.some((answer) => !Number.isInteger(answer))) {
      return NextResponse.json({ error: 'Please answer every question before submitting.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: course, error: courseError } = await admin.from('training_courses').select('id').eq('slug', slug).single();
    if (courseError || !course) throw courseError || new Error('Training course missing');

    const { data: acknowledgement, error: ackError } = await admin.from('training_acknowledgements').select('id').eq('employee_id', employee.id).eq('course_id', course.id).maybeSingle();
    if (ackError) throw ackError;
    if (!acknowledgement) return NextResponse.json({ error: 'Open and acknowledge the training before taking the assessment.' }, { status: 409 });

    const correct = answers.reduce<number>((total, answer, index) => total + (answer === assessment.questions[index].answer ? 1 : 0), 0);
    const percentage = Math.round((correct / assessment.questions.length) * 100);
    const passed = percentage >= 80;

    const { error: attemptError } = await admin.from('quiz_attempts').insert({ employee_id: employee.id, course_id: course.id, score: percentage, pass_mark: 80, passed });
    if (attemptError) throw attemptError;

    if (passed) {
      const { error: progressError } = await admin.from('training_progress').upsert({ employee_id: employee.id, course_id: course.id, status: 'completed', progress_percent: 100, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'employee_id,course_id' });
      if (progressError) throw progressError;
    }

    return NextResponse.json({ percentage, passed });
  } catch (error) {
    return NextResponse.json({ error: safeApiError(error, 'The assessment could not be recorded. Please try again.') }, { status: 500 });
  }
}
