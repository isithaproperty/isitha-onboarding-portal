import {NextResponse} from 'next/server'; import {quiz} from '@/lib/training';
export async function POST(req:Request){const f=await req.formData();let score=0;quiz.forEach((q,i)=>{if(Number(f.get(`q${i}`))===q.answer)score++});const pct=Math.round(score/quiz.length*100);return NextResponse.redirect(new URL(`/training/ohsa-awareness?score=${pct}&passed=${pct>=80}`,req.url),303)}
