-- Design Studio — Initial Database Schema
-- Run this in your Supabase SQL Editor (or via CLI migrations)

-- ═══════════════════════════════════════════
-- Companies (teams)
-- ═══════════════════════════════════════════
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- User profiles (extends Supabase Auth)
-- ═══════════════════════════════════════════
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  company_id uuid references public.companies(id) on delete set null,
  role text not null default 'designer',
  avatar_url text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- Projects
-- JSONB `data` column stores the full project payload
-- (client, property, rooms, moodBoards, etc.)
-- ═══════════════════════════════════════════
create table if not exists public.projects (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  name text not null default 'Untitled Project',
  status text not null default 'draft',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- Chat messages (real-time team chat per project)
-- ═══════════════════════════════════════════
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null not null,
  message text not null,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- Activity log (tracks project events)
-- ═══════════════════════════════════════════
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id text references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════
create index if not exists idx_profiles_company on public.profiles(company_id);
create index if not exists idx_projects_company on public.projects(company_id);
create index if not exists idx_chat_project on public.chat_messages(project_id, created_at);
create index if not exists idx_activity_project on public.activity_log(project_id, created_at);

-- ═══════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.chat_messages enable row level security;
alter table public.activity_log enable row level security;

-- Companies: members can read their own company
create policy "Users can view own company"
  on public.companies for select
  using (id in (select company_id from public.profiles where id = auth.uid()));

-- Profiles: users can read profiles in their company
create policy "Users can view company profiles"
  on public.profiles for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- Projects: company members can CRUD their company's projects
create policy "Company members can view projects"
  on public.projects for select
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Company members can create projects"
  on public.projects for insert
  with check (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Company members can update projects"
  on public.projects for update
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

create policy "Company members can delete projects"
  on public.projects for delete
  using (company_id in (select company_id from public.profiles where id = auth.uid()));

-- Chat: company members can read/write chat in their projects
create policy "Company members can view chat"
  on public.chat_messages for select
  using (project_id in (select id from public.projects where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Company members can send chat"
  on public.chat_messages for insert
  with check (user_id = auth.uid() and project_id in (select id from public.projects where company_id in (select company_id from public.profiles where id = auth.uid())));

-- Activity: company members can view activity
create policy "Company members can view activity"
  on public.activity_log for select
  using (project_id in (select id from public.projects where company_id in (select company_id from public.profiles where id = auth.uid())));

create policy "Company members can log activity"
  on public.activity_log for insert
  with check (project_id in (select id from public.projects where company_id in (select company_id from public.profiles where id = auth.uid())));

-- ═══════════════════════════════════════════
-- Enable Realtime for chat
-- ═══════════════════════════════════════════
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.projects;

-- ═══════════════════════════════════════════
-- Helper function: auto-update updated_at
-- ═══════════════════════════════════════════
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();
