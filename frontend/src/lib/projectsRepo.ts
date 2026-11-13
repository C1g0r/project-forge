/**
 * projectsRepo.ts — CRUD for `projects` table on Supabase.
 *
 * Table schema (run in Supabase SQL editor):
 *
 *   create table if not exists projects (
 *     id          uuid primary key default gen_random_uuid(),
 *     project_name text not null default 'Novo Documento',
 *     modules     jsonb not null default '{}',
 *     created_at  timestamptz not null default now(),
 *     updated_at  timestamptz not null default now()
 *   );
 *
 *   -- Allow anon read/write (no auth needed for this tool)
 *   alter table projects enable row level security;
 *   create policy "anon all" on projects for all using (true) with check (true);
 */

import { supabase } from './supabase';
import type { ModuleId } from '../forge-engine/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SavedModuleContent {
  [moduleId: string]: { content: string };
}

export interface ProjectRecord {
  id: string;
  project_name: string;
  modules: SavedModuleContent;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function assertSupabase() {
  if (!supabase) throw new Error('Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// ── API ────────────────────────────────────────────────────────────────────

/** Save or update a project. Pass id to update, omit to insert. */
export async function saveProject(
  projectName: string,
  modules: Record<ModuleId, { content: string }>,
  id?: string,
): Promise<ProjectRecord> {
  assertSupabase();

  const payload = {
    project_name: projectName,
    modules: modules as SavedModuleContent,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase!
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`Supabase update error: ${error.message}`);
    return data as ProjectRecord;
  } else {
    const { data, error } = await supabase!
      .from('projects')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(`Supabase insert error: ${error.message}`);
    return data as ProjectRecord;
  }
}

/** List all projects, most recently updated first. */
export async function listProjects(): Promise<ProjectListItem[]> {
  assertSupabase();
  const { data, error } = await supabase!
    .from('projects')
    .select('id, project_name, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Supabase list error: ${error.message}`);
  return (data ?? []) as ProjectListItem[];
}

/** Load a single project by id (includes modules). */
export async function loadProject(id: string): Promise<ProjectRecord> {
  assertSupabase();
  const { data, error } = await supabase!
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Supabase load error: ${error.message}`);
  return data as ProjectRecord;
}

/** Delete a project by id. */
export async function deleteProject(id: string): Promise<void> {
  assertSupabase();
  const { error } = await supabase!.from('projects').delete().eq('id', id);
  if (error) throw new Error(`Supabase delete error: ${error.message}`);
}
