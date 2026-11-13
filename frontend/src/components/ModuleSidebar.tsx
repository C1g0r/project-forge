import React from 'react';
import { useForgeStore, MODULE_META } from '../store/forgeStore';
import type { ModuleId } from '../forge-engine/types';

function scoreLabel(score: number): { grade: string; color: string } {
  if (score >= 93) return { grade: 'S', color: 'text-violet-400' };
  if (score >= 83) return { grade: 'A', color: 'text-emerald-400' };
  if (score >= 70) return { grade: 'B', color: 'text-blue-400' };
  if (score >= 55) return { grade: 'C', color: 'text-yellow-400' };
  if (score >= 40) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-red-400' };
}

function issueBar(result: { issues: Array<{ severity: string }> } | null) {
  if (!result) return null;
  const critical = result.issues.filter(i => i.severity === 'critical').length;
  const warning = result.issues.filter(i => i.severity === 'warning').length;
  if (critical === 0 && warning === 0) return null;
  return (
    <div className="flex gap-1 mt-1">
      {critical > 0 && (
        <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">
          {critical}C
        </span>
      )}
      {warning > 0 && (
        <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-mono">
          {warning}W
        </span>
      )}
    </div>
  );
}

export function ModuleSidebar() {
  const { activeModule, modules, setActiveModule } = useForgeStore();

  return (
    <nav className="w-56 shrink-0 flex flex-col gap-1 py-2 select-none">
      {MODULE_META.map((meta) => {
        const mod = modules[meta.id as ModuleId];
        const result = mod.result;
        const isActive = activeModule === meta.id;
        const hasContent = mod.content.trim().length > 0;

        return (
          <button
            key={meta.id}
            onClick={() => setActiveModule(meta.id as ModuleId)}
            className={[
              'w-full text-left px-3 py-2.5 rounded-lg transition-all duration-100',
              'flex flex-col gap-0.5 group',
              isActive
                ? 'bg-zinc-700/80 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{meta.icon}</span>
                <span className="text-xs font-medium truncate">{meta.shortLabel}</span>
              </div>
              {result && hasContent && (
                <span className={`text-xs font-bold font-mono shrink-0 ${scoreLabel(result.score).color}`}>
                  {scoreLabel(result.score).grade}
                  <span className="text-[10px] opacity-70 ml-0.5">{Math.round(result.score)}</span>
                </span>
              )}
              {!result && hasContent && (
                <span className="text-[10px] text-zinc-600">•••</span>
              )}
              {!hasContent && (
                <span className="text-[10px] text-zinc-700">—</span>
              )}
            </div>
            {issueBar(result)}
          </button>
        );
      })}
    </nav>
  );
}
