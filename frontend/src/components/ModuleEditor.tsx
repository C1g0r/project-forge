import React, { useEffect, useRef, useCallback } from 'react';
import type { ModuleId, ValidationIssue } from '../forge-engine/types';
import { useForgeStore, MODULE_META } from '../store/forgeStore';
import { validateModule } from '../forge-engine/module-validator';

const DEBOUNCE_MS = 600;

function severityIcon(sev: string) {
  if (sev === 'critical') return '🔴';
  if (sev === 'warning') return '🟡';
  return '🔵';
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="space-y-1.5 mt-2">
      {issues.map((issue, i) => (
        <li key={i} className="flex gap-2 text-xs">
          <span className="shrink-0 mt-0.5">{severityIcon(issue.severity)}</span>
          <div className="min-w-0">
            <span className="font-mono text-zinc-500 mr-1">[{issue.code}]</span>
            <span className="text-zinc-300">{issue.message}</span>
            {issue.suggestion && (
              <div className="text-zinc-500 mt-0.5 italic">{issue.suggestion}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color =
    score >= 93 ? '#a78bfa' :
    score >= 83 ? '#34d399' :
    score >= 70 ? '#60a5fa' :
    score >= 55 ? '#facc15' :
    score >= 40 ? '#fb923c' :
    '#f87171';
  const grade =
    score >= 93 ? 'S' :
    score >= 83 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F';

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center leading-none z-10">
        <span className="text-xs font-bold" style={{ color }}>{grade}</span>
        <span className="text-[10px] text-zinc-500">{Math.round(score)}</span>
      </div>
    </div>
  );
}

export function ModuleEditor() {
  const { activeModule, modules, setModuleContent, setModuleResult } = useForgeStore();
  const meta = MODULE_META.find(m => m.id === activeModule)!;
  const mod = modules[activeModule as ModuleId];
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = useCallback((id: ModuleId, content: string) => {
    if (!content.trim()) return;
    const result = validateModule(id, content);
    setModuleResult(id, result);
  }, [setModuleResult]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setModuleContent(activeModule as ModuleId, val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runValidation(activeModule as ModuleId, val);
    }, DEBOUNCE_MS);
  };

  // Validate on module switch if content exists and no result yet
  useEffect(() => {
    if (mod.content.trim() && !mod.result) {
      runValidation(activeModule as ModuleId, mod.content);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeModule]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = mod.result;
  const critical = result?.issues.filter(i => i.severity === 'critical') ?? [];
  const warnings = result?.issues.filter(i => i.severity === 'warning') ?? [];
  const infos = result?.issues.filter(i => i.severity === 'info') ?? [];

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl">{meta.icon}</span>
        <div className="min-w-0">
          <h2 className="text-zinc-100 font-semibold text-sm leading-tight">{meta.label}</h2>
          <div className="text-zinc-500 text-xs">
            Peso: <span className="text-zinc-400 font-mono">{meta.weight}×</span>
          </div>
        </div>
        {result && mod.content.trim() && (
          <div className="ml-auto">
            <ScoreRing score={result.score} />
          </div>
        )}
      </div>

      {/* Editor + validation split */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Textarea */}
        <textarea
          className={[
            'flex-1 min-h-0 resize-none rounded-lg p-3 text-sm font-mono',
            'bg-zinc-900 border text-zinc-200 placeholder-zinc-600',
            'focus:outline-none focus:ring-1 focus:ring-zinc-600',
            'leading-relaxed',
            critical.length > 0
              ? 'border-red-500/40'
              : warnings.length > 0
              ? 'border-yellow-500/30'
              : result
              ? 'border-zinc-700'
              : 'border-zinc-800',
          ].join(' ')}
          value={mod.content}
          onChange={handleChange}
          placeholder={meta.placeholder}
          spellCheck={false}
        />

        {/* Validation panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {!result && !mod.content.trim() && (
            <div className="text-zinc-600 text-xs text-center pt-8">
              Escreve conteúdo para validar.
            </div>
          )}

          {!result && mod.content.trim() && (
            <div className="text-zinc-500 text-xs text-center pt-8 animate-pulse">
              A validar…
            </div>
          )}

          {result && (
            <>
              {/* Score summary */}
              <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wide">
                    Score
                  </div>
                  <div className="text-zinc-400 text-xs">
                    {result.present ? '✓ presente' : '✗ ausente'}
                  </div>
                </div>
                <div className="text-zinc-300 text-xs">
                  <span className="font-mono text-zinc-100">{Math.round(result.score)}/100</span>
                  <span className="text-zinc-600 ml-2">· peso {result.weight}×</span>
                </div>
                {result.excerpt && (
                  <div className="mt-2 text-[10px] font-mono text-zinc-600 truncate bg-zinc-950 rounded px-2 py-1">
                    {result.excerpt.slice(0, 60)}…
                  </div>
                )}
              </div>

              {/* Issues */}
              {critical.length > 0 && (
                <div className="bg-red-950/30 rounded-lg p-3 border border-red-500/20">
                  <div className="text-red-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    Crítico ({critical.length})
                  </div>
                  <IssueList issues={critical} />
                </div>
              )}

              {warnings.length > 0 && (
                <div className="bg-yellow-950/20 rounded-lg p-3 border border-yellow-500/20">
                  <div className="text-yellow-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    Avisos ({warnings.length})
                  </div>
                  <IssueList issues={warnings} />
                </div>
              )}

              {infos.length > 0 && (
                <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                  <div className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">
                    Info ({infos.length})
                  </div>
                  <IssueList issues={infos} />
                </div>
              )}

              {critical.length === 0 && warnings.length === 0 && (
                <div className="bg-emerald-950/30 rounded-lg p-3 border border-emerald-500/20 text-xs text-emerald-400">
                  ✓ Módulo limpo — sem issues.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
