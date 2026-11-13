import React from 'react';
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

export function ConstitutionSidebar() {
  const {
    activeModule,
    modules,
    benchmarkReport,
    setActiveModule,
    getCompletedModuleCount,
    getTotalModuleCount,
  } = useConstitutionStore();

  const completed = getCompletedModuleCount();
  const total = getTotalModuleCount();
  const progressPct = Math.round((completed / total) * 100);

  return (
    <aside className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">
          OCE Pipeline
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
  );
}
