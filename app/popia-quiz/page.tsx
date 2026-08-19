'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

const questions = [
  { q: 'When should you access personal information?', options: ['Whenever it is available', 'Only when authorised and needed for a legitimate business reason', 'Whenever a colleague asks'], answer: 1 },
  { q: 'What should you do before emailing personal information?', options: ['Send quickly', 'Check the recipient, need and attachments', 'Copy everyone in'], answer: 1 },
  { q: 'What should you do if personal information is sent to the wrong person?', options: ['Delete your sent email and say nothing', 'Report it immediately', 'Wait to see if anyone complains'], answer: 1 },
  { q: 'Can you share your work password with a colleague?', options: ['Yes, if they are senior', 'Yes, if you trust them', 'No'], answer: 2 },
  { q: 'Which is the safest approach when working from home?', options: ['Let family use the company laptop', 'Lock the screen when unattended and use approved systems', 'Save files to a personal USB drive'], answer: 1 },
  { q: 'What does data minimisation mean?', options: ['Collect only the information genuinely required', 'Collect everything in case it is useful later', 'Delete every record immediately'], answer: 0 },
  { q: 'What should happen to personal information that no longer needs to be retained?', options: ['Keep it forever', 'Follow company retention and secure-destruction procedures', 'Copy it to a personal drive'], answer: 1 },
  { q: 'Which can be a personal-data incident?', options: ['A lost laptop', 'An email sent to the wrong person', 'Both of these'], answer: 2 },
  { q: 'What should you do with a suspicious link asking you to confirm account details?', options: ['Click it to check', 'Do not click and report it', 'Forward it to colleagues'], answer: 1 },
  { q: 'What score is required to pass this POPIA assessment?', options: ['50%', '70%', '80%'], answer: 2 },
];

export default function PopiaQuizPage() {
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const score = answers.reduce((total, answer, index) => answer === questions[index].answer ? total + 1 : total, 0);
  const percentage = Math.round((score / questions.length) * 100);
  const passed = percentage >= 80;
  const allAnswered = answers.every((answer) => answer !== -1);

  function selectAnswer(questionIndex: number, optionIndex: number) {
    const updated = [...answers];
    updated[questionIndex] = optionIndex;
    setAnswers(updated);
    setSubmitted(false);
    setSaveMessage('');
  }

  async function submitAssessment() {
    if (saving || !allAnswered) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { setSaveMessage('Please sign in before submitting the assessment.'); return; }

      const { data: employee, error: employeeError } = await supabase.from('employees').select('id').eq('auth_user_id', user.id).single();
      if (employeeError || !employee) { setSaveMessage('Your employee profile could not be found.'); return; }

      const { data: course, error: courseError } = await supabase.from('training_courses').select('id').eq('slug', 'popia-data-protection').single();
      if (courseError || !course) { setSaveMessage('POPIA training course could not be found.'); return; }

      const { error: attemptError } = await supabase.from('quiz_attempts').insert({ employee_id: employee.id, course_id: course.id, score: percentage, pass_mark: 80, passed });
      if (attemptError) { setSaveMessage(`Unable to save assessment: ${attemptError.message}`); return; }

      if (passed) {
        const { error: progressError } = await supabase.from('training_progress').upsert({ employee_id: employee.id, course_id: course.id, status: 'completed', progress_percent: 100, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'employee_id,course_id' });
        if (progressError) { setSaveMessage('Assessment passed, but training progress could not be updated.'); setSubmitted(true); return; }
      }

      setSubmitted(true);
      setSaveMessage(passed ? '✓ Assessment result saved. POPIA training completed.' : 'Assessment result saved. You must achieve 80% to pass.');
    } finally { setSaving(false); }
  }

  return (
    <main className="shell">
      <Header />
      <section className="hero"><span className="pill">Assessment</span><h1>POPIA & Data Protection Assessment</h1><p className="muted">Answer all 10 questions. A minimum score of 80% is required to pass.</p></section>
      <section className="section">
        {questions.map((question, questionIndex) => (
          <div className="card" key={question.q} style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 20 }}>{questionIndex + 1}. {question.q}</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {question.options.map((option, optionIndex) => (
                <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => selectAnswer(questionIndex, optionIndex)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="section"><div className="card">
        <button className="button" disabled={!allAnswered || saving} onClick={submitAssessment} style={{ border: 0, cursor: allAnswered ? 'pointer' : 'not-allowed', opacity: allAnswered ? 1 : 0.5 }}>{saving ? 'Saving assessment...' : 'Submit assessment'}</button>
        {saveMessage && <p style={{ marginTop: 16, fontWeight: 600 }}>{saveMessage}</p>}
        {submitted && <div style={{ marginTop: 24 }}><h2>Score: {percentage}%</h2>{passed ? <><p className="ok">✓ Assessment passed</p><p>You have successfully completed the POPIA & Data Protection assessment.</p></> : <><p className="warn">Assessment not passed</p><p>You need at least 80%. Please review the POPIA training and try again.</p><Link href="/training/popia-data-protection" className="button">Review POPIA training</Link></>}</div>}
      </div></section>
      <section className="section"><Link href="/">← Back to My Portal</Link></section>
    </main>
  );
}
