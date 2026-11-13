import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import { CONSTITUTION_MODULE_META, type ConstitutionModuleId } from './types';

const STATUS_ICONS: Record<string, string> = {
  idle: '○',
  generating: '◎',
  done: '●',
  error: '✕',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-zinc-500',
  generating: 'text-amber-400 animate-pulse',
  done: 'text-emerald-400',
  error: 'text-red-400',
};

const GRADE_COLOR: Record<string, string> = {
  S: 'text-purple-300',
  A: 'text-emerald-300',
  B: 'text-blue-300',
  C: 'text-amber-300',
  D: 'text-orange-400',
  F: 'text-red-400',
};

// ── Confirmation Modal ────────────────────────────────────────────────────────
interface ConfirmResetModalProps {
  completedCount: number;
  hasConstitution: boolean;
  hasBenchmark: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmResetModal({
  completedCount,
  hasConstitution,
  hasBenchmark,
  onConfirm,
  onCancel,
}: ConfirmResetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 mx-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-white text-center mb-2">
          Novo Projeto
        </h3>

        <p className="text-sm text-zinc-400 text-center mb-4">
          Todo o trabalho atual será apagado.
        </p>

        {/* What will be lost */}
        <div className="bg-zinc-800/60 rounded-lg p-3 mb-5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className={completedCount > 0 ? 'text-amber-400' : 'text-zinc-600'}>■</span>
            <span>
              {completedCount > 0
                ? <><span className="text-zinc-200 font-medium">{completedCount} módulo{completedCount !== 1 ? 's' : ''}</span> gerado{completedCount !== 1 ? 's' : ''}</>
                : 'Nenhum módulo gerado'
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className={hasConstitution ? 'text-emerald-400' : 'text-zinc-600'}>■</span>
            <span>
              {hasConstitution
                ? <><span className="text-zinc-200 font-medium">Constituição compilada</span></>
                : 'Nenhuma constituição compilada'
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className={hasBenchmark ? 'text-blue-400' : 'text-zinc-600'}>■</span>
            <span>
              {hasBenchmark
                ? <><span className="text-zinc-200 font-medium">Relatório de benchmark</span></>
                : 'Nenhum relatório de benchmark'
              }
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            Novo Projeto
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ─────────────────────────────────────────────────────────────
export function ConstitutionSidebar() {
  const {
    activeModule,
    modules,
    benchmarkReport,
    constitution,
    setActiveModule,
    resetAll,
    getCompletedModuleCount,
    getTotalModuleCount,
  } = useConstitutionStore();

  const [showConfirm, setShowConfirm] = useState(false);

  const completed = getCompletedModuleCount();
  const total = getTotalModuleCount();
  const progressPct = Math.round((completed / total) * 100);

  const handleNewProject = () => {
    // If there's nothing to lose, skip confirmation
    if (completed === 0 && !constitution && !benchmarkReport) {
      resetAll();
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowConfirm(false);
    resetAll();
  };

  return (
    <>
      {showConfirm && (
        <ConfirmResetModal
          completedCount={completed}
          hasConstitution={!!constitution}
          hasBenchmark={!!benchmarkReport}
          onConfirm={handleConfirmReset}
          onCancel={() => setShowConfirm(false)}
        />
      )}

    <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            OCE Pipeline
          </div>
          {/* Novo Projeto button */}
          <button
            onClick={handleNewProject}
            title="Novo Projeto — apaga o trabalho atual e recomeça"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors group"
          >
            <svg className="w-3.5 h-3.5 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v16m8-8H4" />
            </svg>
            <span>Novo</span>
          </button>
        </div>
        <div className="text-sm text-zinc-300 font-medium">
          {completed}/{total} modules
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Module list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {CONSTITUTION_MODULE_META.map((meta) => {
          const moduleState = modules[meta.id as ConstitutionModuleId];
          const status = moduleState?.status ?? 'idle';
          const isActive = activeModule === meta.id;

          return (
            <button
              key={meta.id}
              onClick={() => setActiveModule(meta.id as ConstitutionModuleId)}
              className={`
                w-full text-left px-4 py-3 flex items-start gap-3 transition-colors
                ${isActive
                  ? 'bg-zinc-800 border-l-2 border-amber-400'
                  : 'border-l-2 border-transparent hover:bg-zinc-800/50'
                }
              `}
            >
              {/* Status dot */}
              <span className={`mt-0.5 text-sm font-mono flex-shrink-0 ${STATUS_COLORS[status]}`}>
                {STATUS_ICONS[status]}
              </span>

              {/* Module info */}
              <div className="min-w-0">
                <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                  {meta.label}
                </div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">
                  {meta.description.slice(0, 55)}{meta.description.length > 55 ? '…' : ''}
                </div>
                {status === 'done' && moduleState?.generated && (
                  <div className="text-xs text-emerald-500 mt-0.5">
                    {moduleState.generated.split('\n').length} lines
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Benchmark score */}
      {benchmarkReport && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Benchmark Score</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${GRADE_COLOR[benchmarkReport.grade]}`}>
              {benchmarkReport.grade}
            </span>
            <span className="text-lg font-mono text-zinc-300">
              {benchmarkReport.totalScore}/100
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {benchmarkReport.lineCount.toLocaleString()} lines
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
