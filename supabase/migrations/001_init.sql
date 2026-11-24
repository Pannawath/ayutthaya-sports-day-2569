-- =========================================================================
-- AYUTTHAYA SPORTS DAY 2569 · SUPABASE POSTGRESQL SCHEMA
-- Safe, idempotent migration matching legacy attendance fields + new RBAC
-- =========================================================================

create extension if not exists pgcrypto;

-- 1. User Profiles linked to Supabase Auth
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'STAFF' check (role in ('ADMIN', 'STAFF')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Departments (8 Legacy Departments + Dynamic Quotas & Status)
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  deputy_label text,
  max_capacity integer,
  has_sports boolean not null default false,
  is_stand boolean not null default false,
  is_closed boolean not null default false,
  closed_note text,
  m1_only boolean not null default false,
  no_staff boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 3. Students (Preserves legacy keys + optional student_code + signed QR)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  student_code text unique,
  full_name text not null,
  nickname text not null default '',
  grade text not null,
  class_room text not null,
  number_label text not null,
  role_category text not null default 'department' check (role_category in ('department', 'central')),
  central_position text,
  department_id uuid references public.departments(id) on delete set null,
  position text not null,
  sport_type text,
  auto_assigned boolean not null default false,
  qr_token text not null unique,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_room_num on public.students (class_room, number_label);
create index if not exists idx_students_grade on public.students (grade);
create index if not exists idx_students_dept on public.students (department_id);
create index if not exists idx_students_code on public.students (student_code) where student_code is not null;

-- 4. Check-in Sessions (Rounds / Event Days)
create table if not exists public.check_in_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null default current_date,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 5. Attendance Check-ins (DB-enforced 1 check-in per student per session)
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.check_in_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'PRESENT' check (status in ('PRESENT', 'ABSENT')),
  method text not null default 'MANUAL' check (method in ('QR', 'ID_SEARCH', 'MANUAL', 'BULK_PAPER')),
  note text,
  checked_in_by uuid references public.profiles(id) on delete set null,
  checked_in_by_name text,
  checked_in_at timestamptz not null default now(),
  constraint uq_check_ins_session_student unique (session_id, student_id)
);

create index if not exists idx_check_ins_session on public.check_ins (session_id, checked_in_at desc);
create index if not exists idx_check_ins_student on public.check_ins (student_id);

-- 6. Announcements (News & Schedule with cover image)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'NEWS' check (category in ('NEWS', 'SCHEDULE')),
  content text not null,
  image_url text,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_by_name text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_pub on public.announcements (is_published, published_at desc);

-- 7. System Policies & Settings (Synced globally across all devices)
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 8. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);

-- =========================================================================
-- HELPER ROLE FUNCTIONS FOR RLS
-- =========================================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.students enable row level security;
alter table public.check_in_sessions enable row level security;
alter table public.check_ins enable row level security;
alter table public.announcements enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (auth.uid() = id or public.current_user_role() = 'ADMIN');

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.current_user_role() = 'ADMIN');

-- Departments (Public Read, Admin Write)
drop policy if exists "departments_public_read" on public.departments;
create policy "departments_public_read" on public.departments
  for select using (true);

drop policy if exists "departments_admin_write" on public.departments;
create policy "departments_admin_write" on public.departments
  for all using (public.current_user_role() = 'ADMIN');

-- Students (Public Read & Public Registration Insert via API, Admin Write/Delete)
drop policy if exists "students_public_read" on public.students;
create policy "students_public_read" on public.students
  for select using (true);

drop policy if exists "students_admin_write" on public.students;
create policy "students_admin_write" on public.students
  for all using (public.current_user_role() = 'ADMIN');

-- Check-in Sessions (Public Read, Admin Write)
drop policy if exists "sessions_public_read" on public.check_in_sessions;
create policy "sessions_public_read" on public.check_in_sessions
  for select using (true);

drop policy if exists "sessions_admin_write" on public.check_in_sessions;
create policy "sessions_admin_write" on public.check_in_sessions
  for all using (public.current_user_role() = 'ADMIN');

-- Check-ins (Public Read status, Staff & Admin Write)
drop policy if exists "check_ins_public_read" on public.check_ins;
create policy "check_ins_public_read" on public.check_ins
  for select using (true);

drop policy if exists "check_ins_staff_admin_insert" on public.check_ins;
create policy "check_ins_staff_admin_insert" on public.check_ins
  for insert with check (public.current_user_role() in ('ADMIN', 'STAFF'));

drop policy if exists "check_ins_admin_update_delete" on public.check_ins;
create policy "check_ins_admin_update_delete" on public.check_ins
  for all using (public.current_user_role() = 'ADMIN');

-- Announcements (Public Read Published, Admin All)
drop policy if exists "announcements_public_read" on public.announcements;
create policy "announcements_public_read" on public.announcements
  for select using (is_published = true or public.current_user_role() = 'ADMIN');

drop policy if exists "announcements_admin_write" on public.announcements;
create policy "announcements_admin_write" on public.announcements
  for all using (public.current_user_role() = 'ADMIN');

-- System Settings (Public Read, Admin Write)
drop policy if exists "settings_public_read" on public.system_settings;
create policy "settings_public_read" on public.system_settings
  for select using (true);

drop policy if exists "settings_admin_write" on public.system_settings;
create policy "settings_admin_write" on public.system_settings
  for all using (public.current_user_role() = 'ADMIN');

-- Audit Logs (Admin Read, Staff/Admin Insert)
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.current_user_role() = 'ADMIN');

drop policy if exists "audit_logs_staff_insert" on public.audit_logs;
create policy "audit_logs_staff_insert" on public.audit_logs
  for insert with check (public.current_user_role() in ('ADMIN', 'STAFF'));

-- =========================================================================
-- STORAGE BUCKET FOR ANNOUNCEMENT IMAGES
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do nothing;

drop policy if exists "announcements_bucket_public_read" on storage.objects;
create policy "announcements_bucket_public_read" on storage.objects
  for select using (bucket_id = 'announcements');

drop policy if exists "announcements_bucket_admin_insert" on storage.objects;
create policy "announcements_bucket_admin_insert" on storage.objects
  for insert with check (bucket_id = 'announcements' and public.current_user_role() = 'ADMIN');

drop policy if exists "announcements_bucket_admin_delete" on storage.objects;
create policy "announcements_bucket_admin_delete" on storage.objects
  for delete using (bucket_id = 'announcements' and public.current_user_role() = 'ADMIN');

-- =========================================================================
-- INITIAL SEED DATA (8 LEGACY DEPARTMENTS + DEFAULT SETTINGS + SESSION)
-- =========================================================================

insert into public.departments (name, deputy_label, max_capacity, has_sports, is_stand, is_closed, closed_note, m1_only, no_staff, sort_order)
values
  ('ฝ่ายอุปกรณ์', null, null, false, false, false, null, false, true, 1),
  ('ฝ่ายผู้นำเชียร์ (หลีด)', null, 18, false, false, false, null, false, false, 2),
  ('ฝ่ายสวัสดิการ', 'รองประธานฝ่ายสวัสดิการ', null, false, false, false, null, false, true, 3),
  ('ฝ่ายกราฟิก', null, null, false, false, false, null, false, true, 4),
  ('ฝ่ายกีฬา', null, null, true, false, true, 'รอประกาศคัดตัวนักกีฬา', false, false, 5),
  ('ฝ่ายสแตนเชียร์', null, null, false, true, false, null, false, false, 6),
  ('ฝ่ายขบวน', null, null, false, false, false, null, false, false, 7),
  ('ฝ่ายดรัมเมเยอร์', null, 12, false, false, false, null, false, false, 8)
on conflict (name) do nothing;

insert into public.system_settings (key, value)
values (
  'registration_policies',
  '{"strictOnePerson": true, "lockM1Registration": true, "m1StandOnly": false}'::jsonb
)
on conflict (key) do nothing;

insert into public.check_in_sessions (title, event_date, is_active)
select 'กีฬาสีอยุธยา 2569 · วันลงทะเบียน / ซ้อมรวม', current_date, true
where not exists (select 1 from public.check_in_sessions);
