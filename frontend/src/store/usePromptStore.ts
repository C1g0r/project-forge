import { create } from 'zustand';
import type {
  ModuleId,
  BuildLevel,
  GeneratedPrompt,
  AppView,
  BuildRequest,
} from '../types';

interface PromptStore {
  // Navigation
  view: AppView;
  setView: (view: AppView) => void;

  // Module selection
  selectedModule: ModuleId | null;
  selectedSubcategory: string;
  setSelectedModule: (id: ModuleId | null) => void;
  setSelectedSubcategory: (sub: string) => void;

  // Build config
  buildLevel: BuildLevel;
  targetModel: string;
  intent: string;
  parameters: Record<string, string>;
  setBuildLevel: (level: BuildLevel) => void;
  setTargetModel: (model: string) => void;
  setIntent: (intent: string) => void;
  setParameter: (key: string, value: string) => void;
  resetParameters: () => void;

  // Generation state
  isGenerating: boolean;
  generationProgress: number;
  generationPhase: string;
  generatedPrompt: GeneratedPrompt | null;
  error: string | null;
  setGenerating: (val: boolean) => void;
  setGenerationProgress: (pct: number, phase: string) => void;
  setGeneratedPrompt: (prompt: GeneratedPrompt | null) => void;
  setError: (err: string | null) => void;

  // History
  history: GeneratedPrompt[];
  addToHistory: (prompt: GeneratedPrompt) => void;
  clearHistory: () => void;
  restoreFromHistory: (prompt: GeneratedPrompt) => void;

  // History panel
  showHistory: boolean;
  setShowHistory: (val: boolean) => void;
  toggleHistory: () => void;

  // Actions
  startBuild: () => BuildRequest | null;
  reset: () => void;
}

export const usePromptStore = create<PromptStore>((set, get) => ({
  // Navigation
  view: 'home',
  setView: (view) => set({ view }),

  // Module selection
  selectedModule: null,
  selectedSubcategory: '',
  setSelectedModule: (id) => set({ selectedModule: id, selectedSubcategory: '', parameters: {}, error: null }),
  setSelectedSubcategory: (sub) => set({ selectedSubcategory: sub }),

  // Build config
  buildLevel: 'advanced',
  targetModel: 'gpt-4o',
  intent: '',
  parameters: {},
  setBuildLevel: (level) => set({ buildLevel: level }),
  setTargetModel: (model) => set({ targetModel: model }),
  setIntent: (intent) => set({ intent }),
  setParameter: (key, value) =>
    set((state) => ({ parameters: { ...state.parameters, [key]: value } })),
  resetParameters: () => set({ parameters: {}, intent: '' }),

  // Generation state
  isGenerating: false,
  generationProgress: 0,
  generationPhase: '',
  generatedPrompt: null,
  error: null,
  setGenerating: (val) => set({ isGenerating: val, generationProgress: val ? 0 : 100 }),
  setGenerationProgress: (pct, phase) =>
    set({ generationProgress: pct, generationPhase: phase }),
  setGeneratedPrompt: (prompt) => set({ generatedPrompt: prompt, isGenerating: false }),
  setError: (err) => set({ error: err, isGenerating: false }),

  // History
  history: [],
  addToHistory: (prompt) =>
    set((state) => ({ history: [prompt, ...state.history].slice(0, 50) })),
  clearHistory: () => set({ history: [] }),
  restoreFromHistory: (prompt) =>
    set({
      generatedPrompt: prompt,
      selectedModule: prompt.module as import('../types').ModuleId,
      view: 'output',
      showHistory: false,
    }),

  // History panel
  showHistory: false,
  setShowHistory: (val) => set({ showHistory: val }),
  toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),

  // Actions
  startBuild: () => {
    const { selectedModule, selectedSubcategory, intent, parameters, buildLevel, targetModel } = get();
    if (!selectedModule || !selectedSubcategory || !intent.trim()) return null;
    return {
      module: selectedModule,
      subcategory: selectedSubcategory,
      intent: intent.trim(),
      parameters,
      level: buildLevel,
      targetModel,
    };
  },

  reset: () =>
    set({
      view: 'home',
      selectedModule: null,
      selectedSubcategory: '',
      buildLevel: 'advanced',
      targetModel: 'gpt-4o',
      intent: '',
      parameters: {},
      isGenerating: false,
      generationProgress: 0,
      generationPhase: '',
      generatedPrompt: null,
      error: null,
    }),
}));
