import React from 'react';
import { useConstitutionStore } from '../store/constitutionStore';

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  S: { color: 'text-purple-300', bg: 'bg-purple-900/40', border: 'border-purple-700', label: 'Supreme' },
  A: { color: 'text-emerald-300', bg: 'bg-emerald-900/40', border: 'border-emerald-700', label: 'Excellent' },
  B: { color: 'text-blue-300', bg: 'bg-blue-900/40', border: 'border-blue-700', label: 'Good' },
  C: { color: 'text-amber-300', bg: 'bg-amber-900/40', border: 'border-amber-700', label: 'Adequate' },
  D: { color: 'text-orange-400', bg: 'bg-orange-900/40', border: 'border-orange-700', label: 'Weak' },
  F: { color: 'text-red-400', bg: 'bg-red-900/40', border: 'border-red-700', label: 'Failing' },
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 85 ? 'bg-emerald-500' :
    pct >= 70 ? 'bg-blue-500' :
    pct >= 55 ? 'bg-amber-500' :
    'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400 w-10 text-right font-mono">{score}/100</span>
    </div>
  );
}

export function BenchmarkScorer() {
  const { benchmarkReport, adversarialReport } = useConstitutionStore();

  if (!benchmarkReport) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Benchmark</div>
        <div className="text-sm text-zinc-600 italic">
          Run audit to see benchmark scores
        </div>
      </div>
    );
  }

  const cfg = GRADE_CONFIG[benchmarkReport.grade] ?? GRADE_CONFIG['F'];

  // Derive adversarial stats from tests array
  const criticalCount = adversarialReport?.tests.filter(t => t.severity === 'critical').length ?? 0;
  const highCount = adversarialReport?.tests.filter(t => t.severity === 'high').length ?? 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-4">
      {/* Grade header */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
        <span className={`text-4xl font-bold font-mono ${cfg.color}`}>
          {benchmarkReport.grade}
        </span>
        <div>
          <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
          <div className="text-zinc-300 font-mono text-lg">{benchmarkReport.totalScore}/100</div>
        </div>
      </div>

      {/* Document stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-zinc-500">Lines</div>
          <div className="text-zinc-200 font-mono font-semibold">{benchmarkReport.lineCount.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-zinc-500">Words</div>
          <div className="text-zinc-200 font-mono font-semibold">{benchmarkReport.wordCount.toLocaleString()}</div>
        </div>
        <div className="bg-zinc-800 rounded p-2 text-center">
          <div className="text-zinc-500">Sections</div>
          <div className="text-zinc-200 font-mono font-semibold">{benchmarkReport.sectionCount}</div>
        </div>
      </div>

      {/* Criteria breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Criteria</div>
        {benchmarkReport.criteriaScores.map((c) => (
          <div key={c.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400">{c.name}</span>
              <span className="text-zinc-500">×{c.weight}%</span>
            </div>
            <ScoreBar score={c.rawScore} />
          </div>
        ))}
      </div>

      {/* Comparison note */}
      {benchmarkReport.comparisonNote && (
        <div className="text-xs text-zinc-500 italic border-l-2 border-zinc-700 pl-2">
          {benchmarkReport.comparisonNote}
        </div>
      )}

      {/* Strengths */}
      {benchmarkReport.overallStrengths.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Strengths</div>
          <ul className="space-y-1">
            {benchmarkReport.overallStrengths.slice(0, 4).map((s, i) => (
              <li key={i} className="text-xs text-emerald-400 flex gap-1">
                <span>✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Findings / gaps */}
      {benchmarkReport.overallFindings.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">Gaps</div>
          <ul className="space-y-1">
            {benchmarkReport.overallFindings.slice(0, 4).map((f, i) => (
              <li key={i} className="text-xs text-red-400 flex gap-1">
                <span>✕</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Adversarial summary */}
      {adversarialReport && (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
            Adversarial — {adversarialReport.aiName}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-800 rounded p-2">
              <div className="text-zinc-500">Total Tests</div>
              <div className="text-zinc-200 font-mono font-semibold">{adversarialReport.testCount}</div>
            </div>
            <div className="bg-zinc-800 rounded p-2">
              <div className="text-zinc-500">Categories</div>
              <div className="text-zinc-200 font-mono font-semibold">
                {Object.keys(adversarialReport.categoryBreakdown).length}
              </div>
            </div>
            {(criticalCount + highCount) > 0 && (
              <div className="col-span-2 bg-red-900/30 border border-red-800 rounded p-2">
                <div className="text-red-400 font-semibold">
                  {criticalCount} critical · {highCount} high severity
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
