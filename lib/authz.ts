export type PortalRole = 'staff' | 'manager' | 'hr_admin' | 'compliance_admin' | 'admin';

const ROLE_ALIASES: Record<string, PortalRole> = {
  staff: 'staff',
  employee: 'staff',
  manager: 'manager',
  hr: 'hr_admin',
  hr_admin: 'hr_admin',
  compliance_admin: 'compliance_admin',
  administrator: 'admin',
  admin: 'admin',
};

export function normaliseRole(value: unknown): PortalRole {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ROLE_ALIASES[key] || 'staff';
}

export function canViewHr(role: PortalRole) {
  return role === 'hr_admin' || role === 'admin';
}

export function canViewCompliance(role: PortalRole) {
  return role === 'compliance_admin' || role === 'hr_admin' || role === 'admin';
}

export function canManageManagers(role: PortalRole) {
  return role === 'hr_admin' || role === 'admin';
}

export function canReviewLeave(role: PortalRole) {
  return role === 'manager' || role === 'hr_admin' || role === 'admin';
}

export function canManageContracts(role: PortalRole) {
  return role === 'manager' || role === 'hr_admin' || role === 'admin';
}

export function canManageAppraisals(role: PortalRole) {
  return role === 'manager' || role === 'hr_admin' || role === 'admin';
}

export function assignableRoles(role: PortalRole): PortalRole[] {
  if (role === 'admin') return ['staff', 'manager', 'hr_admin', 'compliance_admin', 'admin'];
  if (role === 'hr_admin') return ['staff', 'manager'];
  if (role === 'manager') return ['staff'];
  return [];
}
