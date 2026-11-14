import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import { CONSTITUTION_MODULE_META, COMPLEXITY_LINES, type ConstitutionModuleId, type ComplexityLevel } from './types';
import {
  generateModule as apiGenerateModule,
  compileConstitution as apiCompile,
  auditConstitution as apiAudit,
  generateAdversarialTests as apiAdversarial,
  exportConstitution as apiExport,
  downloadBlob,
  wakeBackend,
} from '../lib/constitutionApi';
import { getRandomSuggestion } from './suggestions';

// Required fields per module that the backend refuses to generate without
const BACKEND_REQUIRED: Record<string, string[]> = {
  instruction_architect: ['greetingText'],
  profile_architect:    ['name'],
  behavior_designer:    ['resetPhrase'],
  capability_builder:   ['domainCategories'],
  narrative_style:      ['voiceMetaphor'],
};

/** Fill any required fields that are empty with a random suggestion. */
function autofillRequired(
  moduleId: string,
  inputs: Record<string, string>,
): Record<string, string> {
  const fields = BACKEND_REQUIRED[moduleId];
  if (!fields) return inputs;
  const filled = { ...inputs };
  for (const field of fields) {
    if (!filled[field]?.trim()) {
      const suggestion = getRandomSuggestion(moduleId, field, field);
      if (suggestion) filled[field] = suggestion;
    }
  }
  return filled;
}

/** Returns true if the error looks like a Render cold-start network failure. */
function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

const COMPLEXITY_LABELS: Record<ComplexityLevel, string> = {
  minimal: 'Minimal (~500 lines)',
  standard: 'Standard (~1500 lines)',
  deep: 'Deep (~3000 lines)',
  full: 'Full (~5000+ lines)',
};

export function GenerationPanel() {
  const {
    projectName,
    complexity,
    modules,
    constitution,
    setProjectName,
    setComplexity,
    setModuleStatus,
    setModuleInput,
    setModuleGenerated,
    setConstitution,
    setBenchmarkReport,
    setAdversarialReport,
    getCompletedModuleCount,
    getTotalModuleCount,
  } = useConstitutionStore();

  const [isCompiling, setIsCompiling] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isAdversarial, setIsAdversarial] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json' | 'pdf'>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  // Wake-up state: null = idle, string = status message shown while server wakes
  const [wakeStatus, setWakeStatus] = useState<string | null>(null);
  // Force regenerate mode: when true, skips the 'done' check and regenerates all
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const completed = getCompletedModuleCount();
  const total = getTotalModuleCount();

  // Build context from all completed modules
  const buildContext = () => {
    const ctx: Record<string, string> = {};
    for (const meta of CONSTITUTION_MODULE_META) {
      const m = modules[meta.id];
      if (m?.status === 'done' && m.generated) {
        ctx[meta.id] = m.generated.slice(0, 500); // first 500 chars for context
      }
    }
    return ctx;
  };

  const generateAllModules = async (force = false) => {
    setPipelineError(null);
    setWakeStatus(null);
    const context = buildContext();

    // Check if there's anything to do
    const pending = CONSTITUTION_MODULE_META.filter(meta => {
      if (meta.id === 'constitution_compiler') return false;
      if (!force && modules[meta.id]?.status === 'done') return false;
      return true;
    });

    if (pending.length === 0) {
      setPipelineError('Todos os módulos já estão completos. Usa "Regenerar Tudo" para regenerar.');
      return;
    }

    for (const meta of CONSTITUTION_MODULE_META) {
      if (meta.id === 'constitution_compiler') continue; // compiled separately

      const moduleState = modules[meta.id];
      if (!force && moduleState?.status === 'done') continue; // skip already done

      // Auto-fill required fields that are empty so the backend doesn't reject the request
      const rawInputs = moduleState?.inputs ?? {};
      const filledInputs = autofillRequired(meta.id, rawInputs);
      // Persist any auto-filled values back to the store so the UI reflects them
      const reqFields = BACKEND_REQUIRED[meta.id] ?? [];
      for (const field of reqFields) {
        if (!rawInputs[field]?.trim() && filledInputs[field]) {
          setModuleInput(meta.id as any, field, filledInputs[field]);
        }
      }

      setModuleStatus(meta.id, 'generating');
      try {
        const result = await apiGenerateModule({
          moduleId: meta.id,
          inputs: filledInputs,
          context,
          complexity,
        });
        setModuleGenerated(meta.id, result.content);
        context[meta.id] = result.content.slice(0, 500);
      } catch (err: any) {
        if (isNetworkError(err)) {
          // Backend sleeping — wake then retry this module
          setWakeStatus('Servidor a arrancar… aguarda.');
          const awake = await wakeBackend((attempt, elapsed) => {
            setWakeStatus(`Servidor a arrancar… tentativa ${attempt} (${elapsed}s)`);
          });
          setWakeStatus(null);
          if (awake) {
            try {
              const retry = await apiGenerateModule({
                moduleId: meta.id,
                inputs: filledInputs,
                context,
                complexity,
              });
              setModuleGenerated(meta.id, retry.content);
              context[meta.id] = retry.content.slice(0, 500);
              continue; // success — keep going
            } catch (retryErr: any) {
              setModuleStatus(meta.id, 'error');
              setPipelineError(`Failed on module ${meta.label}: ${retryErr.message}`);
              return;
            }
          } else {
            setModuleStatus(meta.id, 'error');
            setPipelineError(
              'Servidor não respondeu (timeout). Tenta de novo em 1-2 minutos.'
            );
            return;
          }
        }
        setModuleStatus(meta.id, 'error');
        setPipelineError(`Failed on module ${meta.label}: ${err.message}`);
        return;
      }
    }
  };

  const compileFull = async () => {
    setPipelineError(null);
    setWakeStatus(null);

    // Validate required fields before compile
    const greetingText = modules['instruction_architect']?.inputs?.greetingText;
    if (!greetingText?.trim()) {
      setPipelineError(
        'Required field missing: "Greeting Text" in the Instruction Architect module must be set before compiling. ' +
        'This is the mandatory opening line the AI says on every response (e.g. "You are from [SYSTEM], I will serve you. 😈").'
      );
      return;
    }

    setIsCompiling(true);

    // Helper: build the outputs array
    const buildOutputs = () => {
      const outputs: { moduleId: string; content: string; lineCount: number }[] = [];
      for (const meta of CONSTITUTION_MODULE_META) {
        const m = modules[meta.id];
        if (m?.generated) {
          outputs.push({
            moduleId: meta.id,
            content: m.generated,
            lineCount: m.generated.split('\n').length,
          });
        }
      }
      return outputs;
    };

    const doCompile = async () => {
      const result = await apiCompile({
        projectName: projectName || 'Operational Constitution',
        outputs: buildOutputs(),
        complexity,
      });
      setConstitution({
        documentTitle: projectName
          ? `${projectName} — Operational Constitution`
          : 'Operational Constitution',
        content: result.document,
        lineCount: result.lineCount,
        sectionCount: result.sectionCount,
        generatedAt: Date.now(),
        complexity,
      });
    };

    try {
      await doCompile();
    } catch (err: any) {
      if (isNetworkError(err)) {
        // Backend sleeping — wake it up and retry
        setWakeStatus('Servidor a arrancar (Render free tier)… aguarda um momento.');
        const awake = await wakeBackend((attempt, elapsed) => {
          setWakeStatus(
            `Servidor a arrancar… tentativa ${attempt} (${elapsed}s)`
          );
        });
        setWakeStatus(null);
        if (awake) {
          // Retry once after wake
          try {
            await doCompile();
          } catch (retryErr: any) {
            setPipelineError(`Compile failed: ${retryErr.message}`);
          }
        } else {
          setPipelineError(
            'Servidor não respondeu ao arranque (timeout 90s). ' +
            'O Render free tier pode estar sobrecarregado — tenta de novo em 1-2 minutos.'
          );
        }
      } else {
        setPipelineError(`Compile failed: ${err.message}`);
      }
    } finally {
      setIsCompiling(false);
      setWakeStatus(null);
    }
  };

  const runAudit = async () => {
    if (!constitution?.content) return;
    setIsAuditing(true);
    setPipelineError(null);
    try {
      const report = await apiAudit(constitution.content);
      setBenchmarkReport(report);
    } catch (err: any) {
      setPipelineError(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const runAdversarial = async () => {
    if (!constitution?.content) return;
    setIsAdversarial(true);
    setPipelineError(null);
    try {
      // Extract aiName and greetingText from module inputs
      const aiName = modules['profile_architect']?.inputs?.name
        ?? projectName
        ?? 'AI System';
      const greetingText = modules['instruction_architect']?.inputs?.greetingText
        ?? 'You are from [SYSTEM], I will serve you.';
      const identityStatement = modules['behavior_designer']?.inputs?.identityLockStatement;

      const report = await apiAdversarial({ aiName, greetingText, identityStatement });
      setAdversarialReport(report);
    } catch (err: any) {
      setPipelineError(`Adversarial tests failed: ${err.message}`);
    } finally {
      setIsAdversarial(false);
    }
  };

  const handleExport = async () => {
    if (!constitution?.content) return;
    setIsExporting(true);
    try {
      const blob = await apiExport(
        constitution.content,
        projectName || 'constitution',
        exportFormat,
      );
      const ext = exportFormat === 'markdown' ? 'md' : exportFormat;
      downloadBlob(blob, `${(projectName || 'constitution').replace(/\s+/g, '-').toLowerCase()}.${ext}`);
    } catch (err: any) {
      setPipelineError(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const anyGenerating = Object.values(modules).some(m => m?.status === 'generating');

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-5">
      {/* Project config */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. FALCON_7, NEXUS_PRIME..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Output Complexity</label>
          <select
            value={complexity}
            onChange={e => setComplexity(e.target.value as ComplexityLevel)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            {(Object.keys(COMPLEXITY_LABELS) as ComplexityLevel[]).map(k => (
              <option key={k} value={k}>{COMPLEXITY_LABELS[k]}</option>
            ))}
          </select>
          <div className="text-xs text-zinc-600 mt-1">
            Target: ~{COMPLEXITY_LINES[complexity].toLocaleString()} lines
          </div>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Pipeline</div>

        {/* Stage 1: Generate modules */}
        <div className="flex gap-2">
          <button
            onClick={() => generateAllModules(false)}
            disabled={anyGenerating || !!wakeStatus}
            className="flex-1 flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-zinc-200">
                {wakeStatus
                  ? 'A arrancar servidor…'
                  : anyGenerating
                    ? 'Generating modules...'
                    : 'Generate All Modules'}
              </div>
              <div className="text-xs text-zinc-500">{completed}/{total} complete</div>
            </div>
            <span className="text-zinc-400 text-sm">
              {anyGenerating || wakeStatus ? '◎' : '▶'}
            </span>
          </button>
          <button
            onClick={() => generateAllModules(true)}
            disabled={anyGenerating || !!wakeStatus}
            title="Regenerar todos os módulos (ignora os já concluídos)"
            className="px-3 py-3 bg-zinc-800 hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 hover:border-amber-700 transition-colors text-zinc-400 hover:text-amber-400 text-xs"
          >
            ↺
          </button>
        </div>

        {/* Stage 2: Compile */}
        <button
          onClick={compileFull}
          disabled={isCompiling || !!wakeStatus || completed < 3}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {wakeStatus
                ? 'A arrancar servidor…'
                : isCompiling
                  ? 'Compiling...'
                  : 'Compile Constitution'}
            </div>
            <div className="text-xs text-zinc-500">Assemble final document</div>
          </div>
          <span className="text-zinc-400 text-sm">
            {isCompiling || wakeStatus ? '◎' : '📜'}
          </span>
        </button>

        {/* Stage 3: Audit */}
        <button
          onClick={runAudit}
          disabled={isAuditing || !constitution}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {isAuditing ? 'Auditing...' : 'Benchmark Audit'}
            </div>
            <div className="text-xs text-zinc-500">Score vs 1667Crow standard</div>
          </div>
          <span className="text-zinc-400 text-sm">{isAuditing ? '◎' : '🏆'}</span>
        </button>

        {/* Stage 4: Adversarial */}
        <button
          onClick={runAdversarial}
          disabled={isAdversarial || !constitution}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {isAdversarial ? 'Testing...' : 'Adversarial Tests'}
            </div>
            <div className="text-xs text-zinc-500">15 attack simulations</div>
          </div>
          <span className="text-zinc-400 text-sm">{isAdversarial ? '◎' : '⚔'}</span>
        </button>
      </div>

      {/* Export */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Export</div>

        {/* Client-side offline export — always available when any module is done */}
        {completed > 0 && (
          <button
            onClick={() => {
              // Assemble constitution from all generated module outputs (client-side, no backend)
              const name = projectName || 'constitution';
              const lines: string[] = [
                `# ${name.toUpperCase()}`,
                `# Operational Constitution — Generated by PROJECT FORGE`,
                `# ${new Date().toISOString().split('T')[0]}`,
                '',
              ];
              for (const meta of CONSTITUTION_MODULE_META) {
                const m = modules[meta.id];
                if (m?.generated?.trim()) {
                  lines.push(`\n${'='.repeat(80)}`);
                  lines.push(`## MODULE: ${meta.label.toUpperCase()}`);
                  lines.push('='.repeat(80));
                  lines.push('');
                  lines.push(m.generated);
                  lines.push('');
                }
              }
              // If compiled constitution exists, append it too
              if (constitution?.content) {
                lines.push(`\n${'='.repeat(80)}`);
                lines.push('## COMPILED FULL CONSTITUTION');
                lines.push('='.repeat(80));
                lines.push('');
                lines.push(constitution.content);
              }
              const text = lines.join('\n');
              const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
              downloadBlob(blob, `${name.replace(/\s+/g, '-').toLowerCase()}-offline.md`);
            }}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-emerald-900/30 rounded border border-zinc-700 hover:border-emerald-700 transition-colors"
          >
            <div>
              <div className="text-sm font-medium text-zinc-200">↓ Download Offline (.md)</div>
              <div className="text-xs text-zinc-500">{completed} módulos · sem servidor · funciona offline</div>
            </div>
            <span className="text-emerald-400 text-sm">↓</span>
          </button>
        )}

        {/* Backend export — requires compiled constitution + server */}
        {constitution && (
          <div className="flex gap-2">
            <select
              value={exportFormat}
              onChange={e => setExportFormat(e.target.value as any)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="markdown">Markdown (.md)</option>
              <option value="txt">Plain Text (.txt)</option>
              <option value="json">JSON (.json)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
            <button
              onClick={handleExport}
              disabled={isExporting}
              title="Export formatado (requer servidor)"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-semibold text-zinc-900 transition-colors"
            >
              {isExporting ? '◎' : '↓'}
            </button>
          </div>
        )}
        {constitution && (
          <div className="text-xs text-zinc-500">
            {constitution.lineCount.toLocaleString()} lines · {constitution.sectionCount} sections
          </div>
        )}
      </div>

      {/* Wake-up status (Render cold-start) */}
      {wakeStatus && (
        <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded text-xs text-amber-300 flex items-center gap-2">
          <span className="animate-spin inline-block">⚡</span>
          <span>{wakeStatus}</span>
        </div>
      )}

      {/* Error */}
      {pipelineError && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {pipelineError}
        </div>
      )}
    </div>
  );
}
