'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { complianceAssessments } from '@/lib/compliance-assessments';

export default function ComplianceAssessmentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const assessment = complianceAssessments[slug];
  const [answers, setAnswers] = useState<number[]>(new Array(assessment?.questions.length || 0).fill(-1));
  const [result, setResult] = useState<{ percentage: number; passed: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!assessment) return <main className="shell"><Header/><section className="hero"><h1>Assessment not found</h1><Link href="/">← Back to My Portal</Link></section></main>;

  const allAnswered = answers.every((answer) => answer !== -1);

  function selectAnswer(questionIndex: number, optionIndex: number) {
    const updated = [...answers];
    updated[questionIndex] = optionIndex;
    setAnswers(updated);
    setResult(null);
    setMessage('');
  }

  async function submitAssessment() {
    if (saving || !allAnswered) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/training/${slug}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || 'The assessment could not be recorded.'); return; }
      setResult({ percentage: data.percentage, passed: data.passed });
      setMessage(data.passed ? '✓ Assessment passed and training completed.' : 'You must achieve at least 80% to pass. Please review the training and try again.');
    } catch {
      setMessage('The assessment could not be recorded. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return <main className="shell"><Header/><section className="hero"><span className="pill">Assessment</span><h1>{assessment.title}</h1><p className="muted">Answer all 10 questions. A minimum score of 80% is required to pass.</p></section><section className="section">{assessment.questions.map((question, questionIndex)=><div className="card" key={question.q} style={{marginBottom:18}}><h2 style={{fontSize:20}}>{questionIndex+1}. {question.q}</h2><div style={{display:'grid',gap:10}}>{question.options.map((option,optionIndex)=><label key={option} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex]===optionIndex} onChange={()=>selectAnswer(questionIndex,optionIndex)}/><span>{option}</span></label>)}</div></div>)}</section><section className="section"><div className="card"><button className="button" disabled={!allAnswered||saving} onClick={submitAssessment} style={{border:0,cursor:allAnswered?'pointer':'not-allowed',opacity:allAnswered?1:.5}}>{saving?'Saving assessment...':'Submit assessment'}</button>{message&&<p role="status" style={{marginTop:16,fontWeight:600}}>{message}</p>}{result&&<div style={{marginTop:24}}><h2>Score: {result.percentage}%</h2>{result.passed?<p className="ok">✓ Assessment passed</p>:<><p className="warn">Assessment not passed</p><Link href={`/training/${slug}`} className="button">Review training</Link></>}</div>}</div></section><section className="section"><Link href={`/training/${slug}`}>← Back to training</Link></section></main>;
}
