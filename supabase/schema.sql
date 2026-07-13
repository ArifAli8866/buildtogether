-- =============================================================
-- COFOUND — Supabase schema
-- Run this whole file once in Supabase SQL Editor (SQL Editor -> New query).
-- Safe to re-run: it drops and recreates its own objects.
-- =============================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
do $$ begin
  create type project_status as enum ('idea', 'in_progress', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'accepted', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------

-- One row per user, mirrors auth.users. This is the public "resume" profile.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  skills text[] default '{}',
  github_url text,
  linkedin_url text,
  website_url text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  tagline text not null,
  description text not null,
  tags text[] default '{}',
  status project_status not null default 'idea',
  repo_url text,
  cover_color text default '#7C6FF0',
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'Contributor',
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists join_requests (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null default '',
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists discussion_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  assignee_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists progress_updates (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- Helper function: is this user on the project team (or owner)? ----------
create or replace function is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from projects p where p.id = p_project_id and p.owner_id = p_user_id
    union
    select 1 from team_members tm where tm.project_id = p_project_id and tm.user_id = p_user_id
  );
$$;

-- ---------- Auto-create a profile row whenever a new auth user signs up ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if base_username = '' or base_username is null then
    base_username := 'builder';
  end if;
  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Owner automatically becomes the first team member when a project is created.
create or replace function handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'Founder')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_project_created on projects;
create trigger on_project_created
  after insert on projects
  for each row execute procedure handle_new_project();

-- Accepting a join request automatically adds the requester to the team.
create or replace function handle_request_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into team_members (project_id, user_id, role)
    values (new.project_id, new.user_id, 'Contributor')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_request_accepted on join_requests;
create trigger on_request_accepted
  after update on join_requests
  for each row execute procedure handle_request_accepted();

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table projects enable row level security;
alter table team_members enable row level security;
alter table join_requests enable row level security;
alter table discussion_messages enable row level security;
alter table tasks enable row level security;
alter table progress_updates enable row level security;

-- profiles: readable by everyone (it's a public resume), editable by owner only
drop policy if exists "profiles are publicly readable" on profiles;
create policy "profiles are publicly readable" on profiles for select using (true);

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- projects: readable by everyone, writable by owner
drop policy if exists "projects are publicly readable" on projects;
create policy "projects are publicly readable" on projects for select using (true);

drop policy if exists "authenticated users create projects" on projects;
create policy "authenticated users create projects" on projects for insert with check (auth.uid() = owner_id);

drop policy if exists "owner updates project" on projects;
create policy "owner updates project" on projects for update using (auth.uid() = owner_id);

drop policy if exists "owner deletes project" on projects;
create policy "owner deletes project" on projects for delete using (auth.uid() = owner_id);

-- team_members: readable by everyone (public team roster), managed via triggers/owner
drop policy if exists "team members are publicly readable" on team_members;
create policy "team members are publicly readable" on team_members for select using (true);

drop policy if exists "owner manages team" on team_members;
create policy "owner manages team" on team_members for delete using (
  auth.uid() in (select owner_id from projects where id = project_id)
);

-- join_requests: requester and project owner can see; anyone authenticated can request; owner can update status
drop policy if exists "requester or owner reads requests" on join_requests;
create policy "requester or owner reads requests" on join_requests for select using (
  auth.uid() = user_id or auth.uid() in (select owner_id from projects where id = project_id)
);

drop policy if exists "authenticated users create requests" on join_requests;
create policy "authenticated users create requests" on join_requests for insert with check (auth.uid() = user_id);

drop policy if exists "owner updates request status" on join_requests;
create policy "owner updates request status" on join_requests for update using (
  auth.uid() in (select owner_id from projects where id = project_id)
);

-- discussion_messages: only team members (+ owner) can read/write
drop policy if exists "team reads discussion" on discussion_messages;
create policy "team reads discussion" on discussion_messages for select using (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "team posts discussion" on discussion_messages;
create policy "team posts discussion" on discussion_messages for insert with check (
  auth.uid() = user_id and is_project_member(project_id, auth.uid())
);

-- tasks: only team members (+ owner) can read/write
drop policy if exists "team reads tasks" on tasks;
create policy "team reads tasks" on tasks for select using (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "team creates tasks" on tasks;
create policy "team creates tasks" on tasks for insert with check (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "team updates tasks" on tasks;
create policy "team updates tasks" on tasks for update using (
  is_project_member(project_id, auth.uid())
);

-- progress_updates (workspace feed): only team members (+ owner) can read/write
drop policy if exists "team reads progress" on progress_updates;
create policy "team reads progress" on progress_updates for select using (
  is_project_member(project_id, auth.uid())
);

drop policy if exists "team posts progress" on progress_updates;
create policy "team posts progress" on progress_updates for insert with check (
  auth.uid() = user_id and is_project_member(project_id, auth.uid())
);

-- ---------- Realtime (optional but recommended for live discussion/workspace) ----------
alter publication supabase_realtime add table discussion_messages;
alter publication supabase_realtime add table progress_updates;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table join_requests;
