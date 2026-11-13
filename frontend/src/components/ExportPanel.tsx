import React, { useState, useMemo } from 'react';
import type { ModuleId } from '../forge-engine/types';
import { useForgeStore, MODULE_META } from '../store/forgeStore';
import type { ForgeStore } from '../store/forgeStore';
import { analyzeDocument } from '../forge-engine/analyzer';

function assembleDocument(projectName: string, modules: ForgeStore['modules']): string {
  const lines: string[] = [];
  lines.push(`# ${projectName}`);
  lines.push('');

  for (const meta of MODULE_META) {
    const content = modules[meta.id as ModuleId].content.trim();
    if (!content) continue;
    lines.push(`## ${meta.label}`);
    lines.push('');
    lines.push(content);
    lines.push('');
  }

  return lines.join('\n');
}

export function ExportPanel() {
  const { projectName, modules, fullReport, setFullReport, setShowExport } = useForgeStore();
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const assembled = useMemo(
    () => assembleDocument(projectName, modules),
    [projectName, modules]
  );

  const filledModules = MODULE_META.filter(m => modules[m.id as ModuleId].content.trim().length > 0);
  const wordCount = assembled.split(/\s+/).filter(Boolean).length;

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const report = analyzeDocument(assembled);
      setFullReport(report);
      setAnalyzing(false);
    }, 100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(assembled).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([assembled], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallScore = fullReport?.totalScore ?? null;
  const grade = fullReport?.grade ?? null;
  const gradeColor =
    grade === 'S' ? 'text-violet-400' :
    grade === 'A' ? 'text-emerald-400' :
    grade === 'B' ? 'text-blue-400' :
    grade === 'C' ? 'text-yellow-400' :
    grade === 'D' ? 'text-orange-400' :
    'text-red-400';

  // flat list of all cross-validation issues
  const crossIssues = fullReport?.crossValidation.flatMap(cv => cv.issues) ?? [];

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setShowExport(false)}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
        >
          ← Voltar
        </button>
        <h2 className="text-zinc-100 font-semibold text-sm">Export & Análise Completa</h2>
        <div className="ml-auto flex items-center gap-2">
          {overallScore !== null && grade && (
            <span className={`text-sm font-bold font-mono ${gradeColor}`}>
              {grade} {Math.round(overallScore)}
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || filledModules.length === 0}
            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40
                       text-zinc-200 text-xs font-medium transition-colors"
          >
            {analyzing ? 'A analisar…' : 'Analisar tudo'}
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600
                       text-zinc-200 text-xs font-medium transition-colors"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600
                       text-zinc-200 text-xs font-medium transition-colors"
          >
            Download .txt
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 shrink-0 text-xs text-zinc-500">
        <span>{filledModules.length} / {MODULE_META.length} módulos preenchidos</span>
        <span>·</span>
        <span>{wordCount.toLocaleString()} palavras</span>
        {fullReport && (
          <>
            <span>·</span>
            <span className="text-red-400">
              {fullReport.summary.criticalIssues} críticos
            </span>
            <span className="text-yellow-400">
              {fullReport.summary.warnings} avisos
            </span>
          </>
        )}
      </div>

      {/* Full report (if available) */}
      {fullReport && (
        <div className="shrink-0 grid grid-cols-7 gap-2">
          {MODULE_META.map((meta) => {
            const mr = fullReport.modules.find(r => r.id === meta.id);
            if (!mr || !mr.present) return (
              <div key={meta.id} className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800 opacity-40">
                <div className="text-lg">{meta.icon}</div>
                <div className="text-zinc-600 text-[10px] mt-1">—</div>
              </div>
            );
            const g = mr.score >= 93 ? 'S' : mr.score >= 83 ? 'A' : mr.score >= 70 ? 'B' : mr.score >= 55 ? 'C' : mr.score >= 40 ? 'D' : 'F';
            const gc =
              g === 'S' ? 'text-violet-400' : g === 'A' ? 'text-emerald-400' : g === 'B' ? 'text-blue-400' :
              g === 'C' ? 'text-yellow-400' : g === 'D' ? 'text-orange-400' : 'text-red-400';
            return (
              <div key={meta.id} className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
                <div className="text-lg">{meta.icon}</div>
                <div className={`font-bold font-mono text-sm mt-1 ${gc}`}>{g}</div>
                <div className="text-zinc-600 text-[10px]">{Math.round(mr.score)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cross-validation issues */}
      {crossIssues.length > 0 && (
        <div className="shrink-0 bg-zinc-900 rounded-lg p-3 border border-zinc-800">
          <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">
            Cross-Validation
          </div>
          <ul className="space-y-1">
            {crossIssues.map((issue, i) => (
              <li key={i} className="text-xs flex gap-2">
                <span className="shrink-0">
                  {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}
                </span>
                <span className="text-zinc-300">{issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Raw document preview */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-zinc-800">
        <pre className="h-full overflow-auto p-4 text-xs font-mono text-zinc-300 bg-zinc-950 leading-relaxed whitespace-pre-wrap break-words">
          {assembled || <span className="text-zinc-700">Nenhum módulo preenchido ainda.</span>}
        </pre>
      </div>
    </div>
  );
}
