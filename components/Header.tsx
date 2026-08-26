'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { canManageContracts, canManageManagers, canReviewLeave, canViewHr, normaliseRole, type PortalRole } from '@/lib/authz';
import { supabase } from '@/lib/supabase';

export function Header(){
  const[role,setRole]=useState<PortalRole>('staff');
  useEffect(()=>{supabase.auth.getUser().then(({data})=>setRole(normaliseRole(data.user?.app_metadata?.role)))},[]);
  return <header className="site-header"><Link href="/" className="brand-lockup" aria-label="Isitha Global home"><img src="/isitha-global-logo.webp" alt="Isitha Global" className="brand-logo"/><div className="brand-copy"><strong>Staff Portal</strong><span>Onboarding & Compliance</span></div></Link><nav className="site-nav" aria-label="Portal navigation"><Link href="/">My Portal</Link><Link href="/onboarding">My details</Link><Link href="/privacy">Privacy</Link>{canReviewLeave(role)&&<Link href="/leave/team">Team Leave</Link>}{canViewHr(role)&&<Link href="/admin">HR Admin</Link>}{canViewHr(role)&&<Link href="/admin/leave">Staff Leave</Link>}{canViewHr(role)&&<Link href="/admin/sick-leave">Sick Leave</Link>}{canManageManagers(role)&&<Link href="/admin/managers">Manager Allocation</Link>}{canManageContracts(role)&&<Link href="/contracts/manage">Contracts</Link>}</nav></header>;
}
