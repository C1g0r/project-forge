import React, { useState, useMemo } from 'react';
import type { ModuleId } from '../forge-engine/types';
import { useForgeStore, MODULE_META } from '../store/forgeStore';
import type { ForgeStore } from '../store/forgeStore';
import { analyzeDocument } from '../forge-engine/analyzer';
import { reviewModules } from '../lib/api';
import type { AIReviewReport } from '../lib/api';

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
  const [aiReport, setAiReport] = useState<AIReviewReport | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  const handleAIReview = async () => {
    setAiReviewing(true);
    setAiError(null);
    setAiReport(null);
    try {
      const modulePayloads = MODULE_META.map(m => ({
        id: m.id,
        label: m.label,
        content: modules[m.id as ModuleId].content,
      }));
      const report = await reviewModules(projectName, modulePayloads);
      setAiReport(report);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro na revisão IA.');
    } finally {
      setAiReviewing(false);
    }
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

  // AI score color
  const aiScoreColor = aiReport
    ? aiReport.score >= 85 ? 'text-emerald-400'
    : aiReport.score >= 70 ? 'text-blue-400'
    : aiReport.score >= 50 ? 'text-yellow-400'
    : 'text-red-400'
    : '';

  const issueIcon = (severity: string) =>
    severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';

  const issueBorder = (severity: string) =>
    severity === 'critical' ? 'border-red-900/50 bg-red-950/30'
    : severity === 'warning' ? 'border-yellow-900/50 bg-yellow-950/20'
    : 'border-zinc-800 bg-zinc-900/50';

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
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {overallScore !== null && grade && (
            <span className={`text-sm font-bold font-mono ${gradeColor}`}>
              {grade} {Math.round(overallScore)}
            </span>
          )}
          {aiReport && (
            <span className={`text-sm font-bold font-mono ${aiScoreColor}`}>
              IA {aiReport.score}
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || filledModules.length === 0}
            className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40
                       text-zinc-200 text-xs font-medium transition-colors"
          >
            {analyzing ? 'A analisar…' : 'Analisar'}
          </button>
          <button
            onClick={handleAIReview}
            disabled={aiReviewing || filledModules.length === 0}
            className="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 disabled:opacity-40
                       text-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            {aiReviewing
              ? <><span className="animate-spin inline-block w-3 h-3 border border-t-indigo-300 border-zinc-600 rounded-full" />A rever…</>
              : '✦ Revisão IA'
            }
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
      <div className="flex gap-4 shrink-0 text-xs text-zinc-500 flex-wrap">
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

      {/* Scrollable results area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">

        {/* Module score grid */}
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
          <div className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
            <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">
              Cross-Validation (regras)
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

        {/* AI Review Error */}
        {aiError && (
          <div className="bg-red-950/40 rounded-lg p-3 border border-red-900/60 text-xs text-red-300">
            ✕ {aiError}
          </div>
        )}

        {/* AI Review Report */}
        {aiReport && (
          <div className="space-y-3">
            {/* AI header */}
            <div className="flex items-center gap-3 bg-indigo-950/40 rounded-lg p-3 border border-indigo-900/50">
              <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wide">✦ Revisão IA</span>
              <span className={`font-bold font-mono text-lg ${aiScoreColor}`}>{aiReport.score}</span>
              <span className="text-zinc-400 text-xs flex-1">{aiReport.verdict}</span>
            </div>

            {/* AI issues */}
            {aiReport.issues.length > 0 && (
              <div className="space-y-2">
                {aiReport.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border text-xs ${issueBorder(issue.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">{issueIcon(issue.severity)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-zinc-400 font-medium">{issue.moduleLabel}</span>
                          <span className="text-zinc-600">·</span>
                          <span className={`uppercase tracking-wide font-semibold text-[10px] ${
                            issue.severity === 'critical' ? 'text-red-400'
                            : issue.severity === 'warning' ? 'text-yellow-400'
                            : 'text-blue-400'
                          }`}>{issue.severity}</span>
                        </div>
                        <p className="text-zinc-200 mb-1.5 leading-relaxed">{issue.description}</p>
                        <p className="text-zinc-500 leading-relaxed">
                          <span className="text-zinc-600">↳ </span>{issue.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI strengths */}
            {aiReport.strengths.length > 0 && (
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800">
                <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wide mb-2">
                  Pontos fortes
                </div>
                <ul className="space-y-1">
                  {aiReport.strengths.map((s, i) => (
                    <li key={i} className="text-xs flex gap-2 text-zinc-300">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Raw document preview */}
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="bg-zinc-900/60 px-3 py-1.5 border-b border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase tracking-wide font-semibold">
              Documento montado
            </span>
          </div>
          <pre className="max-h-96 overflow-auto p-4 text-xs font-mono text-zinc-300 bg-zinc-950 leading-relaxed whitespace-pre-wrap break-words">
            {assembled || <span className="text-zinc-700">Nenhum módulo preenchido ainda.</span>}
          </pre>
        </div>

      </div>
    </div>
  );
}
