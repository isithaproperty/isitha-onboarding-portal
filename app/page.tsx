'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { trainingModules } from '@/lib/training';
import { supabase } from '@/lib/supabase';

type Employee = { id:string; first_name:string|null; last_name:string|null; job_title:string|null };
type Progress = { course_id:string; status:string; progress_percent:number };
type Course = { id:string; slug:string; title:string };

export default function Home(){
 const router=useRouter(); const [loading,setLoading]=useState(true); const [employee,setEmployee]=useState<Employee|null>(null); const [courses,setCourses]=useState<Course[]>([]); const [progress,setProgress]=useState<Progress[]>([]); const [portalRole,setPortalRole]=useState('staff');
 useEffect(()=>{loadDashboard()},[]);
 async function loadDashboard(){setLoading(true);const {data:{user}}=await supabase.auth.getUser();if(!user){router.push('/login');return;}setPortalRole(String(user.app_metadata?.role||'staff').toLowerCase());const {data:employeeData,error}=await supabase.from('employees').select('id, first_name, last_name, job_title').eq('auth_user_id',user.id).single();if(error||!employeeData){setLoading(false);return;}setEmployee(employeeData);const {data:courseData}=await supabase.from('training_courses').select('id, slug, title').eq('is_active',true);const {data:progressData}=await supabase.from('training_progress').select('course_id,status,progress_percent').eq('employee_id',employeeData.id);setCourses(courseData||[]);setProgress(progressData||[]);setLoading(false);}
 async function signOut(){await supabase.auth.signOut();router.push('/login');router.refresh();}
 const completedCourseIds=new Set(progress.filter(i=>i.status==='completed').map(i=>i.course_id));const totalCourses=courses.length;const completedCourses=completedCourseIds.size;const trainingPercentage=totalCourses===0?0:Math.round(completedCourses/totalCourses*100);const firstName=employee?.first_name||'Employee';const canManageLeave=['manager','hr','admin'].includes(portalRole);
 if(loading)return <main className="shell"><Header/><section className="hero"><h1>Loading your portal...</h1></section></main>;
 if(!employee)return <main className="shell"><Header/><section className="hero"><h1>Employee profile not found</h1><p className="muted">Please contact HR so your employee profile can be linked.</p><button className="button" onClick={signOut}>Sign out</button></section></main>;
 return <main className="shell"><Header/><section className="hero"><span className="pill">Employee Portal</span><h1>Good morning, {firstName}</h1><p className="muted">Complete your onboarding, mandatory training and policy acknowledgements.</p></section>
 <div className="grid"><div className="card"><div className="muted">Your training progress</div><div className="metric">{trainingPercentage}%</div><div style={{height:8,background:'#e5e7eb',borderRadius:999,overflow:'hidden',marginTop:12,marginBottom:18}}><div style={{width:`${trainingPercentage}%`,height:'100%',background:'#2563eb'}}/></div><div className="muted">{completedCourses} of {totalCourses} courses completed</div></div><div className="card"><div className="muted">Training status</div><div className="metric">{completedCourses} / {totalCourses}</div><p className="muted">{completedCourses===totalCourses&&totalCourses>0?'All mandatory training completed.':`${Math.max(totalCourses-completedCourses,0)} mandatory course${totalCourses-completedCourses===1?'':'s'} remaining.`}</p></div><div className="card"><div className="muted">Compliance status</div><div className="metric">{completedCourses===totalCourses&&totalCourses>0?'Complete':'In progress'}</div><p className="muted">Complete all required training to become compliant.</p></div></div>
 <section className="section"><h2>Leave</h2><div className="grid"><div className="card"><span className="pill">My Leave</span><h3>Request Leave</h3><p className="muted">Submit annual, sick, family responsibility, unpaid or other leave and track the decision.</p><Link className="button" href="/leave">Request / view leave</Link></div>{canManageLeave&&<div className="card"><span className="pill">Manager</span><h3>Team Leave Requests</h3><p className="muted">Review leave requests from your assigned staff and approve or decline them.</p><Link className="button" href="/leave/team">Manage team leave</Link></div>}</div></section>
 <section className="section"><h2>My Training</h2><div className="grid">{trainingModules.map(module=>{const databaseCourse=courses.find(c=>c.slug===module.slug);const completed=databaseCourse?completedCourseIds.has(databaseCourse.id):false;return <div className="card" key={module.slug}><span className="pill">{module.category}</span><h3>{module.title}</h3><p className="muted">{completed?'✓ Completed':'Required'}</p><Link className="button" href={`/training/${module.slug}`}>{completed?'Review training':'Start training'}</Link></div>})}</div></section>
 <section className="section"><div className="card"><h2>Your profile</h2><p><strong>Name:</strong> {employee.first_name} {employee.last_name}</p>{employee.job_title&&<p><strong>Role:</strong> {employee.job_title}</p>}<button className="button" onClick={signOut} style={{border:0,cursor:'pointer',marginTop:12}}>Sign out</button></div></section></main>;
}
