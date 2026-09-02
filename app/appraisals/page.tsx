'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';

type Employee = { id:string; first_name:string|null; last_name:string|null; email:string|null; job_title:string|null; client_name:string|null };
type Appraisal = Record<string, any> & { id:string; employee_id:string; review_date:string; status:string; appraisal_type:string };

type FormState = {
  id:string; employee_id:string; review_date:string; review_period_start:string; review_period_end:string; appraisal_type:string; status:string;
  performance_rating:string; quality_rating:string; communication_rating:string; teamwork_rating:string; reliability_rating:string; initiative_rating:string; leadership_rating:string; overall_rating:string;
  achievements:string; objectives_review:string; strengths:string; improvement_areas:string; attendance_comments:string; conduct_comments:string; training_development:string; career_goals:string; future_objectives:string; manager_comments:string; employee_comments:string; hr_comments:string; action_plan:string; next_review_date:string;
};

const blankForm: FormState = {
  id:'', employee_id:'', review_date:new Date().toISOString().slice(0,10), review_period_start:'', review_period_end:'', appraisal_type:'annual', status:'draft',
  performance_rating:'', quality_rating:'', communication_rating:'', teamwork_rating:'', reliability_rating:'', initiative_rating:'', leadership_rating:'', overall_rating:'',
  achievements:'', objectives_review:'', strengths:'', improvement_areas:'', attendance_comments:'', conduct_comments:'', training_development:'', career_goals:'', future_objectives:'', manager_comments:'', employee_comments:'', hr_comments:'', action_plan:'', next_review_date:'',
};

const ratings = [['1','Needs significant improvement'],['2','Needs improvement'],['3','Meets expectations'],['4','Exceeds expectations'],['5','Outstanding']];

function labelForEmployee(employee?: Employee){
  if(!employee)return 'Unknown employee';
  const name=[employee.first_name,employee.last_name].filter(Boolean).join(' ').trim();
  return name || employee.email || 'Employee';
}

function Rating({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){
  return <label><strong>{label}</strong><select value={value} onChange={e=>onChange(e.target.value)}><option value="">Not rated</option>{ratings.map(([score,text])=><option key={score} value={score}>{score} – {text}</option>)}</select></label>;
}

function TextArea({label,value,onChange,placeholder}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string}){
  return <label><strong>{label}</strong><textarea rows={4} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
}

export default function AppraisalsPage(){
  const[employees,setEmployees]=useState<Employee[]>([]);
  const[appraisals,setAppraisals]=useState<Appraisal[]>([]);
  const[form,setForm]=useState<FormState>(blankForm);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState('');
  const[forbidden,setForbidden]=useState(false);

  useEffect(()=>{void load()},[]);
  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/appraisals',{cache:'no-store'});
      const data=await response.json();
      if(response.status===403){setForbidden(true);return}
      if(!response.ok){setMessage(data.error||'Unable to load appraisals.');return}
      setEmployees(data.employees||[]);setAppraisals(data.appraisals||[]);
    }catch{setMessage('Unable to load appraisals. Please try again.')}finally{setLoading(false)}
  }

  const selectedEmployee=useMemo(()=>employees.find(employee=>employee.id===form.employee_id),[employees,form.employee_id]);
  function set<K extends keyof FormState>(key:K,value:FormState[K]){setForm(current=>({...current,[key]:value}))}
  function newAppraisal(){setForm({...blankForm,review_date:new Date().toISOString().slice(0,10)});setMessage('');window.scrollTo({top:0,behavior:'smooth'})}
  function editAppraisal(appraisal:Appraisal){
    const next={...blankForm};
    for(const key of Object.keys(next) as (keyof FormState)[]){const value=appraisal[key];(next as any)[key]=value===null||value===undefined?'':String(value)}
    setForm(next);setMessage('');window.scrollTo({top:0,behavior:'smooth'});
  }

  async function save(event:FormEvent){
    event.preventDefault();setSaving(true);setMessage('');
    try{
      const response=await fetch('/api/appraisals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await response.json();
      if(!response.ok){setMessage(data.error||'Unable to save appraisal.');return}
      setMessage(form.status==='completed'?'✓ Appraisal completed and saved.':'✓ Draft appraisal saved.');
      setForm(current=>({...current,id:data.appraisal.id}));
      await load();
    }catch{setMessage('Unable to save appraisal. Please try again.')}finally{setSaving(false)}
  }

  if(forbidden)return <main className="shell"><Header/><section className="hero"><h1>Appraisals</h1><p className="muted">This area is only available to Managers and HR.</p></section></main>;

  return <main className="shell appraisal-print"><Header/>
    <section className="hero"><span className="pill">Managers & HR only</span><h1>Employee Appraisals</h1><p className="muted">Create, save and complete structured employee performance appraisals. Managers only see employees assigned to them; HR can access all employees.</p></section>

    <section className="section"><div className="card"><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><h2 style={{marginBottom:4}}>Appraisal document</h2><p className="muted" style={{margin:0}}>{form.id?'Editing an existing appraisal':'Start a new appraisal and save it as a draft until complete.'}</p></div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="button" type="button" onClick={newAppraisal}>New appraisal</button><button className="button" type="button" onClick={()=>window.print()}>Print / Save PDF</button></div></div></div></section>

    {loading?<section className="section"><div className="card">Loading appraisals…</div></section>:
    <form onSubmit={save}>
      <section className="section"><div className="card"><h2>1. Employee & review details</h2><div className="form-grid">
        <label><strong>Employee *</strong><select required value={form.employee_id} onChange={e=>set('employee_id',e.target.value)}><option value="">Select employee</option>{employees.map(employee=><option value={employee.id} key={employee.id}>{labelForEmployee(employee)}{employee.job_title?` – ${employee.job_title}`:''}</option>)}</select></label>
        <label><strong>Appraisal type</strong><select value={form.appraisal_type} onChange={e=>set('appraisal_type',e.target.value)}><option value="annual">Annual appraisal</option><option value="mid_year">Mid-year review</option><option value="quarterly">Quarterly review</option><option value="probation">Probation review</option><option value="other">Other</option></select></label>
        <label><strong>Review date *</strong><input type="date" required value={form.review_date} onChange={e=>set('review_date',e.target.value)}/></label>
        <label><strong>Review period start *</strong><input type="date" required value={form.review_period_start} onChange={e=>set('review_period_start',e.target.value)}/></label>
        <label><strong>Review period end *</strong><input type="date" required value={form.review_period_end} onChange={e=>set('review_period_end',e.target.value)}/></label>
        <label><strong>Next review date</strong><input type="date" value={form.next_review_date} onChange={e=>set('next_review_date',e.target.value)}/></label>
      </div>{selectedEmployee&&<div style={{marginTop:16}}><strong>{labelForEmployee(selectedEmployee)}</strong>{selectedEmployee.job_title&&<span className="muted"> · {selectedEmployee.job_title}</span>}{selectedEmployee.client_name&&<span className="muted"> · {selectedEmployee.client_name}</span>}</div>}</div></section>

      <section className="section"><div className="card"><h2>2. Performance ratings</h2><p className="muted">1 = needs significant improvement, 3 = meets expectations, 5 = outstanding.</p><div className="form-grid">
        <Rating label="Overall performance" value={form.performance_rating} onChange={v=>set('performance_rating',v)}/><Rating label="Quality of work" value={form.quality_rating} onChange={v=>set('quality_rating',v)}/><Rating label="Communication" value={form.communication_rating} onChange={v=>set('communication_rating',v)}/><Rating label="Teamwork" value={form.teamwork_rating} onChange={v=>set('teamwork_rating',v)}/><Rating label="Reliability & ownership" value={form.reliability_rating} onChange={v=>set('reliability_rating',v)}/><Rating label="Initiative" value={form.initiative_rating} onChange={v=>set('initiative_rating',v)}/><Rating label="Leadership / management" value={form.leadership_rating} onChange={v=>set('leadership_rating',v)}/><Rating label="Overall appraisal rating" value={form.overall_rating} onChange={v=>set('overall_rating',v)}/>
      </div></div></section>

      <section className="section"><div className="card"><h2>3. Results, objectives & contribution</h2><div className="form-grid"><TextArea label="Key achievements" value={form.achievements} onChange={v=>set('achievements',v)} placeholder="Major results, projects, client feedback and contributions during the review period."/><TextArea label="Review of previous objectives" value={form.objectives_review} onChange={v=>set('objectives_review',v)} placeholder="What objectives were set, what was achieved, and what remains outstanding?"/><TextArea label="Key strengths" value={form.strengths} onChange={v=>set('strengths',v)}/><TextArea label="Areas for improvement" value={form.improvement_areas} onChange={v=>set('improvement_areas',v)}/></div></div></section>

      <section className="section"><div className="card"><h2>4. Attendance, conduct & working relationships</h2><div className="form-grid"><TextArea label="Attendance & punctuality" value={form.attendance_comments} onChange={v=>set('attendance_comments',v)} placeholder="Attendance, timekeeping, reliability and any relevant leave patterns."/><TextArea label="Conduct & professional standards" value={form.conduct_comments} onChange={v=>set('conduct_comments',v)} placeholder="Professional conduct, policy compliance, client relationships and workplace behaviour."/></div></div></section>

      <section className="section"><div className="card"><h2>5. Development & future objectives</h2><div className="form-grid"><TextArea label="Training & development needs" value={form.training_development} onChange={v=>set('training_development',v)} placeholder="Courses, mentoring, coaching, systems or technical development required."/><TextArea label="Career goals" value={form.career_goals} onChange={v=>set('career_goals',v)}/><TextArea label="Objectives for the next review period" value={form.future_objectives} onChange={v=>set('future_objectives',v)} placeholder="Set clear, measurable objectives and expected outcomes."/><TextArea label="Action plan" value={form.action_plan} onChange={v=>set('action_plan',v)} placeholder="Actions, owners, timescales and follow-up points."/></div></div></section>

      <section className="section"><div className="card"><h2>6. Appraisal comments</h2><div className="form-grid"><TextArea label="Manager / reviewer comments" value={form.manager_comments} onChange={v=>set('manager_comments',v)}/><TextArea label="Employee comments recorded during appraisal" value={form.employee_comments} onChange={v=>set('employee_comments',v)} placeholder="Record the employee's response, comments or points raised during the meeting."/><TextArea label="HR comments" value={form.hr_comments} onChange={v=>set('hr_comments',v)} placeholder="For HR review, moderation or follow-up."/></div></div></section>

      <section className="section"><div className="card"><h2>7. Completion</h2><div className="form-grid"><label><strong>Status</strong><select value={form.status} onChange={e=>set('status',e.target.value)}><option value="draft">Draft</option><option value="completed">Completed</option></select></label></div><p className="muted">Use Draft while the appraisal is being prepared. Change to Completed once the appraisal meeting and review are finished.</p><button className="button" disabled={saving} type="submit" style={{border:0,cursor:saving?'not-allowed':'pointer',opacity:saving?.6:1}}>{saving?'Saving…':form.status==='completed'?'Complete & save appraisal':'Save draft'}</button>{message&&<p role="status" style={{marginTop:16,fontWeight:600}}>{message}</p>}</div></section>
    </form>}

    <section className="section no-print"><div className="card"><h2>Appraisal history</h2>{appraisals.length===0?<p className="muted">No appraisals have been recorded yet.</p>:<div style={{display:'grid',gap:12}}>{appraisals.map(appraisal=>{const employee=employees.find(item=>item.id===appraisal.employee_id);return <div key={appraisal.id} style={{border:'1px solid #ddd',borderRadius:10,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div><strong>{labelForEmployee(employee)}</strong><div className="muted">{appraisal.review_date} · {String(appraisal.appraisal_type||'annual').replace('_',' ')} · {appraisal.status}</div></div><button type="button" className="button" onClick={()=>editAppraisal(appraisal)}>Open appraisal</button></div>})}</div>}</div></section>

    <style jsx global>{`@media print{.site-header,.no-print,button{display:none!important}.shell{max-width:none!important}.card{break-inside:avoid;box-shadow:none!important;border:1px solid #ccc!important}.section{margin:12px 0!important}input,select,textarea{border:0!important;padding:0!important;background:transparent!important;appearance:none!important}.hero{padding-top:0!important}}`}</style>
  </main>;
}
