'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';

type HrNotification = {
  id:string;
  event_type:string;
  title:string;
  message:string;
  action_path:string|null;
  email_status:string;
  email_recipients:string[];
  created_at:string;
  read_at:string|null;
};

export default function HrNotificationsPage(){
  const[notifications,setNotifications]=useState<HrNotification[]>([]);
  const[loading,setLoading]=useState(true);
  const[forbidden,setForbidden]=useState(false);
  const[message,setMessage]=useState('');

  useEffect(()=>{void load()},[]);
  async function load(){
    setLoading(true);setMessage('');
    try{
      const response=await fetch('/api/hr-notifications',{cache:'no-store'});
      const data=await response.json();
      if(response.status===403){setForbidden(true);return}
      if(!response.ok){setMessage(data.error||'Unable to load notifications.');return}
      setNotifications(data.notifications||[]);
    }catch{setMessage('Unable to load notifications. Please try again.')}finally{setLoading(false)}
  }

  async function markRead(id:string){
    await fetch('/api/hr-notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    setNotifications(items=>items.map(item=>item.id===id?{...item,read_at:new Date().toISOString()}:item));
  }

  async function markAllRead(){
    const response=await fetch('/api/hr-notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({markAllRead:true})});
    if(!response.ok){setMessage('Unable to mark notifications as read.');return}
    const now=new Date().toISOString();
    setNotifications(items=>items.map(item=>({...item,read_at:item.read_at||now})));
  }

  if(forbidden)return <main className="shell"><Header/><section className="hero"><h1>HR Notifications</h1><p className="muted">This area is only available to HR and Admin.</p></section></main>;

  const unread=notifications.filter(item=>!item.read_at).length;
  return <main className="shell"><Header/>
    <section className="hero"><span className="pill">HR & Admin</span><h1>HR Notifications</h1><p className="muted">Completed onboarding, appraisals and probation reviews appear here automatically.</p></section>
    <section className="section"><div className="card"><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap'}}><div><h2 style={{marginBottom:4}}>Notification inbox</h2><p className="muted" style={{margin:0}}>{unread} unread notification{unread===1?'':'s'}</p></div>{unread>0&&<button className="button" type="button" onClick={markAllRead}>Mark all read</button>}</div></div></section>
    <section className="section"><div className="card">{loading?<p>Loading notifications…</p>:notifications.length===0?<p className="muted">No HR notifications yet.</p>:<div style={{display:'grid',gap:12}}>{notifications.map(item=><div key={item.id} style={{border:'1px solid #ddd',borderRadius:10,padding:16,opacity:item.read_at?0.72:1}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><strong>{item.title}</strong><div className="muted" style={{fontSize:13,marginTop:4}}>{new Date(item.created_at).toLocaleString()} · Email: {item.email_status.replace('_',' ')}</div></div>{!item.read_at&&<span className="pill">New</span>}</div><p style={{lineHeight:1.6}}>{item.message}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{item.action_path&&<Link className="button" href={item.action_path} onClick={()=>void markRead(item.id)}>Open record</Link>}{!item.read_at&&<button className="button" type="button" onClick={()=>void markRead(item.id)}>Mark read</button>}</div></div>)}</div>}{message&&<p role="status" style={{marginTop:16,fontWeight:600}}>{message}</p>}</div></section>
  </main>;
}
