'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { trainingModules } from '@/lib/training';
import { supabase } from '@/lib/supabase';

export default function TrainingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const module = trainingModules.find((item) => item.slug === slug);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!module) {
    return (
      <main className="shell">
        <Header />
        <section className="hero">
          <h1>Training module not found</h1>
          <Link href="/">← Back to My Portal</Link>
        </section>
      </main>
    );
  }

  async function acknowledgeTraining() {
    setSaving(true);
    setMessage('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage('Please sign in before acknowledging this training.');
        return;
      }

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (employeeError || !employee) {
        setMessage('Your employee profile could not be found.');
        return;
      }

      const { data: course, error: courseError } = await supabase
        .from('training_courses')
        .select('id, version')
        .eq('slug', slug)
        .single();

      if (courseError || !course) {
        setMessage('This training course could not be found.');
        return;
      }

      const { error: acknowledgementError } = await supabase
        .from('training_acknowledgements')
        .insert({
          employee_id: employee.id,
          course_id: course.id,
          course_version: course.version,
        });

      if (acknowledgementError) {
        if (acknowledgementError.code === '23505') {
          setMessage('✓ You have already acknowledged this training version.');
          return;
        }

        setMessage(`Unable to save acknowledgement: ${acknowledgementError.message}`);
        return;
      }

      if (slug !== 'ohsa-awareness') {
  const { error: progressError } = await supabase
    .from('training_progress')
    .upsert(
      {
        employee_id: employee.id,
        course_id: course.id,
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'employee_id,course_id',
      }
    );

  if (progressError) {
    setMessage(
      'Acknowledgement saved, but progress could not be updated.'
    );
    return;
}
  }      
      setMessage(
  slug === 'ohsa-awareness'
    ? '✓ Training acknowledged. You must still pass the OHSA assessment.'
    : '✓ Training successfully acknowledged and completed.'
);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <Header />

      <section className="hero">
        <span className="pill">{module.category}</span>

        <h1>{module.title}</h1>

        <p className="muted">
          Estimated duration: {module.duration}
        </p>
      </section>

      <section className="section">
        {module.sections.map((section, index) => (
          <div
            className="card"
            key={section.title}
            style={{ marginBottom: 18 }}
          >
            <div className="muted">
              Section {index + 1} of {module.sections.length}
            </div>

            <h2>{section.title}</h2>

            <p style={{ lineHeight: 1.7 }}>
              {section.body}
            </p>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="card">
          <h2>Training acknowledgement</h2>

          <p>
            I confirm that I have read and understood this training module.
          </p>

          <button
            className="button"
            onClick={acknowledgeTraining}
            disabled={saving}
            style={{
              border: 0,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving
              ? 'Saving...'
              : 'I have read and understood'}
          </button>

          {message && (
            <p
              style={{
                marginTop: 16,
                fontWeight: 600,
              }}
            >
              {message}
            </p>
          )}
        </div>
      </section>
<section className="section">
  {slug === 'ohsa-awareness' && message && (
    <div style={{ marginBottom: 16 }}>
      <Link href="/quiz" className="button">
        Take OHSA Assessment
      </Link>
    </div>
  )}

  <Link href="/">← Back to My Portal</Link>
</section>
      
    </main>
  );
}
