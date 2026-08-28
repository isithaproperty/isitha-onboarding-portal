'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { canManageContracts, canManageManagers, canReviewLeave, canViewCompliance, canViewHr, normaliseRole, type PortalRole } from '@/lib/authz';
import { supabase } from '@/lib/supabase';

export function Header(){
  const[role,setRole]=useState<PortalRole>('staff');
  const[pendingLeaveCount,setPendingLeaveCount]=useState(0);
  const[showMyDetails,setShowMyDetails]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    async function loadNavigation(){
      const{data}=await supabase.auth.getUser();
      const user=data.user;
      if(!user)return;
      const nextRole=normaliseRole(user.app_metadata?.role);
      if(cancelled)return;
      setRole(nextRole);

      let{data:employee}=await supabase.from('employees').select('id').eq('auth_user_id',user.id).maybeSingle();
      if(!employee&&user.email){
        const byEmail=await supabase.from('employees').select('id').ilike('email',user.email).maybeSingle();
        employee=byEmail.data;
      }
      if(employee){
        const{data:onboarding}=await supabase.from('employee_hr_onboarding').select('status').eq('employee_id',employee.id).maybeSingle();
        const status=String(onboarding?.status||'').toLowerCase();
        if(!cancelled)setShowMyDetails(!['submitted','archived'].includes(status));
      }

      if(canReviewLeave(nextRole)){
        const{count}=await supabase.from('leave_requests').select('id',{count:'exact',head:true}).eq('status','pending');
        if(!cancelled)setPendingLeaveCount(count||0);
      }
    }
    loadNavigation();
    return()=>{cancelled=true};
  },[]);

  const canArchive=role==='hr_admin'||role==='admin';
  return <header className="site-header"><Link href="/" className="brand-lockup" aria-label="Isitha Global home"><img src="/isitha-global-logo.webp" alt="Isitha Global" className="brand-logo"/><div className="brand-copy"><strong>Staff Portal</strong><span>Onboarding & Compliance</span></div></Link><nav className="site-nav" aria-label="Portal navigation"><Link href="/">My Portal</Link>{showMyDetails&&<Link href="/onboarding">My details</Link>}<Link href="/privacy">Privacy</Link>{canReviewLeave(role)&&<Link href="/leave/team" className="nav-with-badge">Team Leave{pendingLeaveCount>0&&<span className="nav-badge" aria-label={`${pendingLeaveCount} pending leave ${pendingLeaveCount===1?'request':'requests'}`}>{pendingLeaveCount}</span>}</Link>}{role==='compliance_admin'&&canViewCompliance(role)&&<Link href="/compliance">Compliance</Link>}{canViewHr(role)&&<Link href="/admin">HR Admin</Link>}{canViewHr(role)&&<Link href="/admin/leave">Staff Leave</Link>}{canArchive&&<Link href="/admin/archive">HR Archive</Link>}{canManageManagers(role)&&<Link href="/admin/managers">Manager Allocation</Link>}{canManageContracts(role)&&<Link href="/contracts/manage">Contracts</Link>}</nav></header>;
}
