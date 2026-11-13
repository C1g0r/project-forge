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
} from '../lib/constitutionApi';

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

  const generateAllModules = async () => {
    setPipelineError(null);
    const context = buildContext();

    for (const meta of CONSTITUTION_MODULE_META) {
      if (meta.id === 'constitution_compiler') continue; // compiled separately

      const moduleState = modules[meta.id];
      if (moduleState?.status === 'done') continue; // skip already done

      setModuleStatus(meta.id, 'generating');
      try {
        const result = await apiGenerateModule({
          moduleId: meta.id,
          inputs: moduleState?.inputs ?? {},
          context,
          complexity,
        });
        setModuleGenerated(meta.id, result.content);
        // Update context with new output
        context[meta.id] = result.content.slice(0, 500);
      } catch (err: any) {
        setModuleStatus(meta.id, 'error');
        setPipelineError(`Failed on module ${meta.label}: ${err.message}`);
        return;
      }
    }
  };

  const compileFull = async () => {
    setIsCompiling(true);
    setPipelineError(null);
    try {
      // Build the outputs array matching backend ModuleOutput[]
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

      const result = await apiCompile({
        projectName: projectName || 'Operational Constitution',
        outputs,
        complexity,
      });

      // Transform CompileResult → GeneratedConstitution for the store
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
    } catch (err: any) {
      setPipelineError(`Compile failed: ${err.message}`);
    } finally {
      setIsCompiling(false);
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
        <button
          onClick={generateAllModules}
          disabled={anyGenerating}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {anyGenerating ? 'Generating modules...' : 'Generate All Modules'}
            </div>
            <div className="text-xs text-zinc-500">{completed}/{total} complete</div>
          </div>
          <span className="text-zinc-400 text-sm">
            {anyGenerating ? '◎' : '▶'}
          </span>
        </button>

        {/* Stage 2: Compile */}
        <button
          onClick={compileFull}
          disabled={isCompiling || completed < 3}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-zinc-700 transition-colors"
        >
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {isCompiling ? 'Compiling...' : 'Compile Constitution'}
            </div>
            <div className="text-xs text-zinc-500">Assemble final document</div>
          </div>
          <span className="text-zinc-400 text-sm">{isCompiling ? '◎' : '📜'}</span>
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
      {constitution && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Export</div>
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-semibold text-zinc-900 transition-colors"
            >
              {isExporting ? '◎' : '↓'}
            </button>
          </div>
          {constitution && (
            <div className="text-xs text-zinc-500">
              {constitution.lineCount.toLocaleString()} lines · {constitution.sectionCount} sections
            </div>
          )}
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
