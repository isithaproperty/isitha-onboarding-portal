'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { quiz } from '@/lib/training';

export default function QuizPage() {
  const [answers, setAnswers] = useState<number[]>(
    new Array(quiz.length).fill(-1)
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [result, setResult] = useState<{percentage:number;passed:boolean}|null>(null);

  const score = answers.reduce((total, answer, index) => {
    return answer === quiz[index].answer ? total + 1 : total;
  }, 0);

  const percentage = Math.round((score / quiz.length) * 100);

  function selectAnswer(questionIndex: number, optionIndex: number) {
    const updated = [...answers];
    updated[questionIndex] = optionIndex;
    setAnswers(updated);
    setSubmitted(false);
    setResult(null);
  }
async function submitAssessment() {
  if (saving) return;

  setSaving(true);
  setSaveMessage('');

  try {
    const response = await fetch('/api/training/ohsa-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const data = await response.json();
    if (!response.ok) {
      setSaveMessage(data.error || 'The assessment could not be recorded.');
      return;
    }
    setResult({ percentage: data.percentage, passed: data.passed });
    setSubmitted(true);
    setSaveMessage(data.passed
      ? '✓ Assessment result verified and saved. OHSA training completed.'
      : 'Assessment result saved. You must achieve 80% to pass.');
  } catch {
    setSaveMessage('The assessment could not be recorded. Please try again.');
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
                Score: {result?.percentage ?? percentage}%
              </h2>

              {result?.passed ? (
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
