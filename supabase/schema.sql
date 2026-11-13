-- PROJECT FORGE — Supabase schema
-- Run this once in your Supabase project's SQL editor.
-- https://app.supabase.com → SQL Editor → New query → paste → Run

-- ── projects table ────────────────────────────────────────────────────────

create table if not exists projects (
  id           uuid         primary key default gen_random_uuid(),
  project_name text         not null default 'Novo Documento',
  modules      jsonb        not null default '{}',
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

-- Index for fast listing by recency
create index if not exists projects_updated_at_idx on projects (updated_at desc);

-- ── Row-Level Security ────────────────────────────────────────────────────
-- The app uses the anon key (no user auth).
-- Enable RLS and allow full anon access for personal/team use.

alter table projects enable row level security;

-- Drop old policies if re-running
drop policy if exists "anon_all" on projects;

create policy "anon_all" on projects
  for all
  using (true)
  with check (true);
