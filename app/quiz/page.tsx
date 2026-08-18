'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { quiz } from '@/lib/training';
import { supabase } from '@/lib/supabase';

export default function QuizPage() {
  const [answers, setAnswers] = useState<number[]>(
    new Array(quiz.length).fill(-1)
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState('');

  const score = answers.reduce((total, answer, index) => {
    return answer === quiz[index].answer ? total + 1 : total;
  }, 0);

  const percentage = Math.round((score / quiz.length) * 100);
  const passed = percentage >= 80;

  function selectAnswer(questionIndex: number, optionIndex: number) {
    const updated = [...answers];
    updated[questionIndex] = optionIndex;
    setAnswers(updated);
    setSubmitted(false);
  }
async function submitAssessment() {
  if (saving) return;

  setSaving(true);
  setSaveMessage('');

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaveMessage('Please sign in before submitting the assessment.');
      return;
    }

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (employeeError || !employee) {
      setSaveMessage('Your employee profile could not be found.');
      return;
    }

    const { data: course, error: courseError } = await supabase
      .from('training_courses')
      .select('id')
      .eq('slug', 'ohsa-awareness')
      .single();

    if (courseError || !course) {
      setSaveMessage('OHSA training course could not be found.');
      return;
    }

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        employee_id: employee.id,
        course_id: course.id,
        score: percentage,
        pass_mark: 80,
        passed: passed,
      });

    if (attemptError) {
      setSaveMessage(`Unable to save assessment: ${attemptError.message}`);
      return;
    }

    if (passed) {
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
        setSaveMessage(
          'Assessment passed, but training progress could not be updated.'
        );
        setSubmitted(true);
        return;
      }
    }

    setSubmitted(true);

    setSaveMessage(
      passed
        ? '✓ Assessment result saved. OHSA training completed.'
        : 'Assessment result saved. You must achieve 80% to pass.'
    );
  } finally {
    setSaving(false);
  }
}
  const allAnswered = answers.every((answer) => answer !== -1);

  return (
    <main className="shell">
      <Header />

      <section className="hero">
        <span className="pill">Assessment</span>
        <h1>OHSA Knowledge Assessment</h1>

        <p className="muted">
          Answer all questions. A minimum score of 80% is required to pass.
        </p>
      </section>

      <section className="section">
        {quiz.map((question, questionIndex) => (
          <div
            className="card"
            key={question.q}
            style={{ marginBottom: 18 }}
          >
            <h2 style={{ fontSize: 20 }}>
              {questionIndex + 1}. {question.q}
            </h2>

            <div style={{ display: 'grid', gap: 10 }}>
              {question.options.map((option, optionIndex) => (
                <label
                  key={option}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    checked={answers[questionIndex] === optionIndex}
                    onChange={() =>
                      selectAnswer(questionIndex, optionIndex)
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="card">
          <button
            className="button"
            disabled={!allAnswered || saving}
onClick={submitAssessment}
            style={{
              border: 0,
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              opacity: allAnswered ? 1 : 0.5,
            }}
          >
            {saving ? 'Saving assessment...' : 'Submit assessment'}
          </button>
{saveMessage && (
  <p style={{ marginTop: 16, fontWeight: 600 }}>
    {saveMessage}
  </p>
)}
          {submitted && (
            <div style={{ marginTop: 24 }}>
              <h2>
                Score: {percentage}%
              </h2>

              {passed ? (
                <>
                  <p className="ok">
                    ✓ Assessment passed
                  </p>

                  <p>
                    You have successfully completed the OHSA knowledge
                    assessment.
                  </p>
                </>
              ) : (
                <>
                  <p className="warn">
                    Assessment not passed
                  </p>

                  <p>
                    You need at least 80%. Please review the training and
                    try again.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <Link href="/">← Back to My Portal</Link>
      </section>
    </main>
  );
}
