import React, { useEffect, useState, useCallback } from 'react';
import { useForgeStore } from '../store/forgeStore';
import { listProjects, deleteProject } from '../lib/projectsRepo';
import { supabaseReady } from '../lib/supabase';
import type { ProjectListItem } from '../lib/projectsRepo';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ProjectLibrary() {
  const { showLibrary, setShowLibrary, loadFromCloud, saveToCloud, cloudSaving, cloudSaveError, cloudId, projectName } =
    useForgeStore();

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!supabaseReady) return;
    setLoading(true);
    setListError(null);
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showLibrary) fetchProjects();
  }, [showLibrary, fetchProjects]);

  if (!showLibrary) return null;

  async function handleLoad(id: string) {
    await loadFromCloud(id);
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeleting(id);
    setConfirmDelete(null);
    try {
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(null);
    }
  }

  async function handleSaveCurrent() {
    await saveToCloud();
    await fetchProjects();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setShowLibrary(false); }}
    >
      {/* Panel */}
      <div className="w-full max-w-xl mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-200 tracking-tight">Biblioteca de Projectos</span>
            {!supabaseReady && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 font-mono">
                offline
              </span>
            )}
          </div>
          <button
            onClick={() => setShowLibrary(false)}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Save current */}
        <div className="px-5 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-400 truncate">
                Projecto actual: <span className="text-zinc-200 font-medium">{projectName || 'Sem nome'}</span>
                {cloudId && <span className="ml-2 text-zinc-600 font-mono text-[10px]">#{cloudId.slice(0, 8)}</span>}
              </div>
              {cloudSaveError && (
                <div className="text-xs text-red-400 mt-0.5 truncate">{cloudSaveError}</div>
              )}
            </div>
            <button
              onClick={handleSaveCurrent}
              disabled={cloudSaving || !supabaseReady}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                cloudSaving || !supabaseReady
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white',
              ].join(' ')}
            >
              {cloudSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A guardar…
                </span>
              ) : cloudId ? '↑ Actualizar' : '↑ Guardar na nuvem'}
            </button>
          </div>
        </div>

        {/* Not configured */}
        {!supabaseReady && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="text-3xl">🔌</div>
            <div className="text-sm font-medium text-zinc-300">Supabase não configurado</div>
            <div className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Adiciona <code className="text-zinc-400 bg-zinc-800 px-1 rounded">VITE_SUPABASE_URL</code> e{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> ao ficheiro{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 rounded">.env.local</code> para activar a biblioteca.
            </div>
          </div>
        )}

        {/* Project list */}
        {supabaseReady && (
          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-3">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-zinc-500 text-sm">
                <span className="inline-block w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                A carregar…
              </div>
            )}

            {listError && !loading && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-3">
                {listError}
              </div>
            )}

            {!loading && !listError && projects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <div className="text-2xl">📂</div>
                <div className="text-sm text-zinc-400">Sem projectos guardados</div>
                <div className="text-xs text-zinc-600">Guarda o projecto actual para começar.</div>
              </div>
            )}

            {!loading && !listError && projects.length > 0 && (
              <ul className="space-y-2">
                {projects.map(p => (
                  <li
                    key={p.id}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors',
                      p.id === cloudId
                        ? 'border-indigo-500/40 bg-indigo-500/8'
                        : 'border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800/80',
                    ].join(' ')}
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200 truncate">{p.project_name}</span>
                        {p.id === cloudId && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono uppercase tracking-wide">
                            actual
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                        {formatDate(p.updated_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Load */}
                      {p.id !== cloudId && (
                        <button
                          onClick={() => handleLoad(p.id)}
                          disabled={cloudSaving}
                          className="px-2.5 py-1 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-40"
                        >
                          Abrir
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className={[
                          'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                          confirmDelete === p.id
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200',
                        ].join(' ')}
                      >
                        {deleting === p.id ? '…' : confirmDelete === p.id ? 'Confirmar?' : '✕'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-zinc-600 font-mono">
            {supabaseReady ? `${projects.length} projecto${projects.length !== 1 ? 's' : ''}` : 'offline mode'}
          </span>
          {supabaseReady && (
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
            >
              ↻ Actualizar lista
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
