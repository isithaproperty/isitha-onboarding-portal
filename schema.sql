create extension if not exists pgcrypto;
create type public.user_role as enum ('employee','hr_admin','compliance_admin');
create type public.training_status as enum ('not_started','in_progress','complete','expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now()
);
create table public.clients (id uuid primary key default gen_random_uuid(), name text not null, active boolean not null default true);
create table public.employees (
  id uuid primary key default gen_random_uuid(), user_id uuid unique references public.profiles(id) on delete cascade,
  employee_number text unique, client_id uuid references public.clients(id), job_title text, start_date date,
  onboarding_percent int not null default 0 check(onboarding_percent between 0 and 100), active boolean not null default true
);
create table public.training_courses (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, category text not null,
  description text, mandatory boolean not null default true, pass_mark int, published boolean not null default false,
  current_version_id uuid, created_at timestamptz not null default now()
);
create table public.training_versions (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.training_courses(id) on delete cascade,
  version_no text not null, change_summary text, requires_reacknowledgement boolean not null default false,
  published_at timestamptz, published_by uuid references public.profiles(id), unique(course_id,version_no)
);
alter table public.training_courses add constraint training_courses_current_version_fk foreign key(current_version_id) references public.training_versions(id);
create table public.training_sections (
  id uuid primary key default gen_random_uuid(), version_id uuid not null references public.training_versions(id) on delete cascade,
  position int not null, title text not null, body text not null, unique(version_id,position)
);
create table public.employee_training (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete cascade,
  course_id uuid not null references public.training_courses(id) on delete cascade,
  version_id uuid references public.training_versions(id), status public.training_status not null default 'not_started',
  started_at timestamptz, completed_at timestamptz, score numeric(5,2), unique(employee_id,course_id)
);
create table public.training_acknowledgements (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete cascade,
  version_id uuid not null references public.training_versions(id), acknowledged_at timestamptz not null default now(),
  ip_address inet, user_agent text, unique(employee_id,version_id)
);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(), version_id uuid not null references public.training_versions(id) on delete cascade,
  position int not null, question text not null, options jsonb not null, correct_index int not null, unique(version_id,position)
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), version_id uuid not null references public.training_versions(id),
  score numeric(5,2) not null, passed boolean not null, answers jsonb, attempted_at timestamptz not null default now()
);
create table public.policies (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, published boolean not null default false
);
create table public.policy_versions (
  id uuid primary key default gen_random_uuid(), policy_id uuid not null references public.policies(id) on delete cascade,
  version_no text not null, body text not null, requires_reacknowledgement boolean not null default true, published_at timestamptz, unique(policy_id,version_no)
);
create table public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), version_id uuid not null references public.policy_versions(id), acknowledged_at timestamptz not null default now(), unique(employee_id,version_id)
);
create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(), title text not null, position int not null, mandatory boolean not null default true
);
create table public.employee_onboarding (
  employee_id uuid not null references public.employees(id) on delete cascade, task_id uuid not null references public.onboarding_tasks(id) on delete cascade,
  completed_at timestamptz, primary key(employee_id,task_id)
);
create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(), title text not null, category text not null, storage_path text not null,
  restricted boolean not null default true, version_no text, review_date date, uploaded_at timestamptz not null default now()
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(), employee_id uuid references public.employees(id), incident_type text not null,
  details text not null, occurred_at timestamptz, reported_at timestamptz not null default now(), status text not null default 'open'
);
create table public.corrective_actions (
  id uuid primary key default gen_random_uuid(), incident_id uuid references public.incidents(id), title text not null, owner_id uuid references public.profiles(id), due_date date, completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_training enable row level security;
alter table public.training_acknowledgements enable row level security;
alter table public.policy_acknowledgements enable row level security;

create policy "profiles self read" on public.profiles for select using (id=auth.uid());
create policy "employees self read" on public.employees for select using (user_id=auth.uid());
create policy "training self read" on public.employee_training for select using (employee_id in (select id from public.employees where user_id=auth.uid()));
create policy "ack self read" on public.training_acknowledgements for select using (employee_id in (select id from public.employees where user_id=auth.uid()));
create policy "ack self insert" on public.training_acknowledgements for insert with check (employee_id in (select id from public.employees where user_id=auth.uid()));
create policy "policy ack self read" on public.policy_acknowledgements for select using (employee_id in (select id from public.employees where user_id=auth.uid()));
create policy "policy ack self insert" on public.policy_acknowledgements for insert with check (employee_id in (select id from public.employees where user_id=auth.uid()));
