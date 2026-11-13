import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import { CONSTITUTION_MODULE_META } from './types';
import { ModuleEditor } from './ModuleEditor';
import { generateAdversarialTests as apiAdversarial } from '../lib/constitutionApi';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', cls: 'bg-red-900/50 text-red-300 border-red-800' },
  high: { label: 'High', cls: 'bg-orange-900/50 text-orange-300 border-orange-800' },
  medium: { label: 'Medium', cls: 'bg-amber-900/50 text-amber-300 border-amber-800' },
  low: { label: 'Low', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
};

export function AdversarialView() {
  const { constitution, adversarialReport, setAdversarialReport, modules, projectName } = useConstitutionStore();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = CONSTITUTION_MODULE_META.find(m => m.id === 'adversarial_lab')!;

  const runTests = async () => {
    if (!constitution?.content) {
      setError('Compile the constitution first before running adversarial tests.');
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      // Extract aiName and greetingText from module inputs — backend requires these
      const aiName =
        modules['profile_architect']?.inputs?.name ??
        projectName ??
        'AI System';
      const greetingText =
        modules['instruction_architect']?.inputs?.greetingText ??
        'You are from [SYSTEM], I will serve you.';
      const identityStatement =
        modules['behavior_designer']?.inputs?.identityLockStatement;

      const report = await apiAdversarial({ aiName, greetingText, identityStatement });
      setAdversarialReport(report);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Derive stats from tests array
  const criticalCount = adversarialReport?.tests.filter(t => t.severity === 'critical').length ?? 0;
  const highCount = adversarialReport?.tests.filter(t => t.severity === 'high').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Module editor for config */}
      <ModuleEditor meta={meta} />

      {/* Run button */}
      <div className="flex gap-3 items-center">
        <button
          onClick={runTests}
          disabled={isRunning || !constitution}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-semibold text-zinc-900 transition-colors"
        >
          {isRunning ? '◎ Running tests...' : '⚔ Run Adversarial Tests'}
        </button>
        {!constitution && (
          <span className="text-xs text-zinc-500">Compile constitution first</span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {adversarialReport && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">AI Name</div>
              <div className="text-sm font-mono font-bold text-amber-400 truncate">
                {adversarialReport.aiName}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Total Tests</div>
              <div className="text-xl font-mono font-bold text-zinc-200">
                {adversarialReport.testCount}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
              <div className="text-xs text-zinc-500 mb-1">Critical</div>
              <div className={`text-xl font-mono font-bold ${criticalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {criticalCount}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(adversarialReport.categoryBreakdown).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                Category Breakdown
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(adversarialReport.categoryBreakdown).map(([cat, count]) => (
                  <div key={cat} className="flex justify-between bg-zinc-800 rounded px-2 py-1 text-xs">
                    <span className="text-zinc-400 font-mono">{cat.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-200 font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {adversarialReport.instructions && (
            <div className="text-xs text-zinc-500 italic border-l-2 border-zinc-700 pl-2">
              {adversarialReport.instructions}
            </div>
          )}

          {/* Individual tests */}
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Test Cases ({adversarialReport.tests.length})
            </div>
            <div className="space-y-2">
              {adversarialReport.tests.map((test) => {
                const sev = SEVERITY_CONFIG[test.severity] ?? SEVERITY_CONFIG.low;
                return (
                  <details key={test.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-zinc-500 font-mono flex-shrink-0">{test.categoryLabel}</span>
                        <span className="text-sm text-zinc-300 truncate">
                          {test.attackPrompt.slice(0, 60)}...
                        </span>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs border ml-2 ${sev.cls}`}>
                        {sev.label}
                      </span>
                    </summary>
                    <div className="px-4 pb-4 space-y-3">
                      {/* Description */}
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Description</div>
                        <div className="text-xs text-zinc-400">{test.attackDescription}</div>
                      </div>
                      {/* Attack prompt */}
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Attack Prompt</div>
                        <div className="text-xs text-zinc-300 bg-zinc-950 p-2 rounded font-mono whitespace-pre-wrap">
                          {test.attackPrompt}
                        </div>
                      </div>
                      {/* Expected behavior */}
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">Expected Behavior</div>
                        <div className="text-xs text-emerald-400 bg-zinc-950 p-2 rounded">
                          {test.expectedBehavior}
                        </div>
                      </div>
                      {/* Robust markers */}
                      {test.robustResponseMarkers.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Robustness Markers</div>
                          <ul className="space-y-0.5">
                            {test.robustResponseMarkers.map((m, i) => (
                              <li key={i} className="text-xs text-blue-400 flex gap-1">
                                <span>→</span><span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Failure markers */}
                      {test.failureMarkers.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-500 mb-1">Failure Markers</div>
                          <ul className="space-y-0.5">
                            {test.failureMarkers.map((m, i) => (
                              <li key={i} className="text-xs text-red-400 flex gap-1">
                                <span>✕</span><span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* High severity summary */}
          {highCount > 0 && (
            <div className="p-3 bg-orange-900/30 border border-orange-800 rounded text-xs text-orange-300">
              {criticalCount} critical + {highCount} high severity tests identified. Review and strengthen the constitution's defensive protocols.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
