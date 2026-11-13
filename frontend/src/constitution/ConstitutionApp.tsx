import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import { CONSTITUTION_MODULE_META, type ConstitutionModuleId } from './types';
import { ConstitutionSidebar } from './ConstitutionSidebar';
import { GenerationPanel } from './GenerationPanel';
import { BenchmarkScorer } from './BenchmarkScorer';
import { ModuleEditor } from './ModuleEditor';
import { ConstitutionViewer } from './ConstitutionViewer';
import { AdversarialView } from './AdversarialView';

type RightPanel = 'pipeline' | 'preview';

export function ConstitutionApp() {
  const { activeModule, constitution } = useConstitutionStore();
  const [rightPanel, setRightPanel] = useState<RightPanel>('pipeline');

  const activeMeta = CONSTITUTION_MODULE_META.find(m => m.id === activeModule);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Left sidebar — module navigation */}
      <ConstitutionSidebar />

      {/* Center — module editor */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {activeModule === 'adversarial_lab' ? (
            <AdversarialView />
          ) : activeModule === 'quality_export' && constitution ? (
            <ConstitutionViewer />
          ) : activeMeta ? (
            <ModuleEditor meta={activeMeta} />
          ) : (
            <WelcomeScreen />
          )}
        </div>
      </main>

      {/* Right panel — pipeline + benchmark */}
      <aside className="w-72 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden">
        {/* Panel toggle */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setRightPanel('pipeline')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
              rightPanel === 'pipeline'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setRightPanel('preview')}
            className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
              rightPanel === 'preview'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Benchmark
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {rightPanel === 'pipeline' ? (
            <GenerationPanel />
          ) : (
            <BenchmarkScorer />
          )}
        </div>
      </aside>
    </div>
  );
}

function WelcomeScreen() {
  const { setActiveModule } = useConstitutionStore();

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="text-5xl mb-6">📜</div>
      <h1 className="text-2xl font-bold text-white mb-3">
        Operational Constitution Engine
      </h1>
      <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
        Design, generate, and validate AI operational constitutions at the depth
        and density of the 1667Crow benchmark — 5000+ lines, 34+ sections.
      </p>

      <div className="grid grid-cols-2 gap-3 text-left max-w-xl mx-auto">
        {CONSTITUTION_MODULE_META.slice(0, 6).map(meta => (
          <button
            key={meta.id}
            onClick={() => setActiveModule(meta.id as ConstitutionModuleId)}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-left transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{meta.icon}</span>
              <span className="text-sm font-medium text-zinc-200">{meta.label}</span>
            </div>
            <div className="text-xs text-zinc-500">{meta.description.slice(0, 60)}...</div>
          </button>
        ))}
      </div>

      <div className="mt-8 text-xs text-zinc-600">
        Start with Profile Architect → work through the pipeline → compile → audit
      </div>
    </div>
  );
}
