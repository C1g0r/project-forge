import React, { useRef } from 'react';
import { useForgeStore, MODULE_META } from './store/forgeStore';
import type { ForgeStore } from './store/forgeStore';
import type { ModuleId } from './forge-engine/types';
import { ModuleSidebar } from './components/ModuleSidebar';
import { ModuleEditor } from './components/ModuleEditor';
import { ExportPanel } from './components/ExportPanel';

function weightedOverallScore(modules: ForgeStore['modules']): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  let anyResult = false;

  for (const meta of MODULE_META) {
    const mod = modules[meta.id as ModuleId];
    if (mod.result && mod.content.trim()) {
      weightedSum += mod.result.score * meta.weight;
      totalWeight += meta.weight;
      anyResult = true;
    }
  }

  if (!anyResult) return null;
  return weightedSum / totalWeight;
}

function OverallScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-700 text-sm font-mono">—</span>;
  const grade =
    score >= 93 ? 'S' :
    score >= 83 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F';
  const color =
    grade === 'S' ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' :
    grade === 'A' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    grade === 'B' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
    grade === 'C' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' :
    grade === 'D' ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
    'text-red-400 bg-red-500/10 border-red-500/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold font-mono ${color}`}>
      {grade}
      <span className="text-[10px] opacity-70">{Math.round(score)}</span>
    </span>
  );
}

export default function App() {
  const { projectName, modules, showExport, setProjectName, setShowExport, resetAll } = useForgeStore();
  const nameRef = useRef<HTMLInputElement>(null);
  const overall = weightedOverallScore(modules);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top header */}
      <header className="shrink-0 h-12 border-b border-zinc-800 flex items-center px-4 gap-3">
        {/* Logo / wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold tracking-tight text-zinc-300">
            PROJECT<span className="text-zinc-500 font-light">FORGE</span>
          </span>
          <span className="text-zinc-700 text-xs font-mono">v2</span>
        </div>

        <div className="w-px h-5 bg-zinc-800 mx-1 shrink-0" />

        {/* Editable project name */}
        <input
          ref={nameRef}
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          className="bg-transparent text-zinc-300 text-sm font-medium border-none outline-none
                     placeholder-zinc-600 min-w-0 flex-1 max-w-xs"
          placeholder="Nome do projecto…"
          onBlur={e => {
            if (!e.target.value.trim()) setProjectName('Novo Documento');
          }}
        />

        <div className="ml-auto flex items-center gap-3">
          {/* Overall score */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 text-xs">Score global:</span>
            <OverallScoreBadge score={overall} />
          </div>

          <div className="w-px h-4 bg-zinc-800 shrink-0" />

          {/* Export toggle */}
          <button
            onClick={() => setShowExport(!showExport)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              showExport
                ? 'bg-zinc-600 text-zinc-100'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300',
            ].join(' ')}
          >
            {showExport ? '← Editor' : 'Export →'}
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              if (confirm('Apagar todos os módulos e recomeçar?')) resetAll();
            }}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
            title="Resetar projecto"
          >
            ↺
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — always visible */}
        <aside className="shrink-0 w-56 border-r border-zinc-800 overflow-y-auto px-2 py-2">
          <ModuleSidebar />
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-w-0 p-4 overflow-hidden">
          {showExport ? <ExportPanel /> : <ModuleEditor />}
        </main>
      </div>
    </div>
  );
}
