// OPERATIONAL CONSTITUTION ENGINE — Zustand Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ConstitutionModuleId,
  ConstitutionModuleState,
  ComplexityLevel,
  BenchmarkReport,
  AdversarialReport,
  GeneratedConstitution,
} from '../constitution/types';
import { CONSTITUTION_MODULE_META } from '../constitution/types';

export interface ConstitutionStore {
  // Project metadata
  projectName: string;
  complexity: ComplexityLevel;
  activeModule: ConstitutionModuleId;

  // Module states (inputs + generated content per module)
  modules: Record<ConstitutionModuleId, ConstitutionModuleState>;

  // Final compiled constitution
  constitution: GeneratedConstitution | null;

  // Benchmark + adversarial reports
  benchmarkReport: BenchmarkReport | null;
  adversarialReport: AdversarialReport | null;

  // UI state
  showCompiler: boolean;
  showAdversarial: boolean;
  showQuality: boolean;
  generatingModuleId: ConstitutionModuleId | null;
  compilingAll: boolean;

  // Pipeline generation status
  pipelineStatus: 'idle' | 'running' | 'complete' | 'error';
  pipelineError: string | null;

  // Actions
  setProjectName: (name: string) => void;
  setComplexity: (c: ComplexityLevel) => void;
  setActiveModule: (id: ConstitutionModuleId) => void;
  setModuleInput: (moduleId: ConstitutionModuleId, fieldId: string, value: string) => void;
  setModuleGenerated: (moduleId: ConstitutionModuleId, content: string) => void;
  setModuleStatus: (moduleId: ConstitutionModuleId, status: ConstitutionModuleState['status'], error?: string) => void;
  setConstitution: (c: GeneratedConstitution | null) => void;
  setBenchmarkReport: (r: BenchmarkReport | null) => void;
  setAdversarialReport: (r: AdversarialReport | null) => void;
  setShowCompiler: (v: boolean) => void;
  setShowAdversarial: (v: boolean) => void;
  setShowQuality: (v: boolean) => void;
  setGeneratingModuleId: (id: ConstitutionModuleId | null) => void;
  setCompilingAll: (v: boolean) => void;
  setPipelineStatus: (s: ConstitutionStore['pipelineStatus'], error?: string) => void;
  resetAll: () => void;

  // Computed helpers
  getModuleInputs: (moduleId: ConstitutionModuleId) => Record<string, string>;
  getAllGeneratedContext: () => Record<string, string>;
  getCompletedModuleCount: () => number;
  getTotalModuleCount: () => number;
}

const DEFAULT_MODULE_STATE = (): ConstitutionModuleState => ({
  inputs: {},
  generated: '',
  status: 'idle',
});

const DEFAULT_MODULES = (): Record<ConstitutionModuleId, ConstitutionModuleState> =>
  Object.fromEntries(
    CONSTITUTION_MODULE_META.map(m => [m.id, DEFAULT_MODULE_STATE()])
  ) as Record<ConstitutionModuleId, ConstitutionModuleState>;

export const useConstitutionStore = create<ConstitutionStore>()(
  persist(
    (set, get) => ({
      projectName: 'Nova Constituição',
      complexity: 'standard',
      activeModule: 'profile_architect',

      modules: DEFAULT_MODULES(),
      constitution: null,
      benchmarkReport: null,
      adversarialReport: null,

      showCompiler: false,
      showAdversarial: false,
      showQuality: false,
      generatingModuleId: null,
      compilingAll: false,

      pipelineStatus: 'idle',
      pipelineError: null,

      // ── Setters ─────────────────────────────────────────────────────────────
      setProjectName: (name) => set({ projectName: name }),
      setComplexity: (complexity) => set({ complexity }),
      setActiveModule: (id) => set({ activeModule: id }),

      setModuleInput: (moduleId, fieldId, value) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [moduleId]: {
              ...s.modules[moduleId],
              inputs: { ...s.modules[moduleId].inputs, [fieldId]: value },
            },
          },
        })),

      setModuleGenerated: (moduleId, content) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [moduleId]: {
              ...s.modules[moduleId],
              generated: content,
              status: 'done',
              generatedAt: Date.now(),
            },
          },
        })),

      setModuleStatus: (moduleId, status, error) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [moduleId]: {
              ...s.modules[moduleId],
              status,
              error,
            },
          },
        })),

      setConstitution: (constitution) => set({ constitution }),
      setBenchmarkReport: (benchmarkReport) => set({ benchmarkReport }),
      setAdversarialReport: (adversarialReport) => set({ adversarialReport }),
      setShowCompiler: (showCompiler) => set({ showCompiler }),
      setShowAdversarial: (showAdversarial) => set({ showAdversarial }),
      setShowQuality: (showQuality) => set({ showQuality }),
      setGeneratingModuleId: (generatingModuleId) => set({ generatingModuleId }),
      setCompilingAll: (compilingAll) => set({ compilingAll }),
      setPipelineStatus: (pipelineStatus, pipelineError) => set({ pipelineStatus, pipelineError: pipelineError ?? null }),

      resetAll: () => set({
        projectName: 'Nova Constituição',
        complexity: 'standard',
        activeModule: 'profile_architect',
        modules: DEFAULT_MODULES(),
        constitution: null,
        benchmarkReport: null,
        adversarialReport: null,
        showCompiler: false,
        showAdversarial: false,
        showQuality: false,
        generatingModuleId: null,
        compilingAll: false,
        pipelineStatus: 'idle',
        pipelineError: null,
      }),

      // ── Computed ─────────────────────────────────────────────────────────────
      getModuleInputs: (moduleId) => get().modules[moduleId].inputs,

      getAllGeneratedContext: () => {
        const { modules } = get();
        return Object.fromEntries(
          Object.entries(modules)
            .filter(([, v]) => v.generated.trim().length > 0)
            .map(([k, v]) => [k, v.generated])
        ) as Record<string, string>;
      },

      getCompletedModuleCount: () => {
        const { modules } = get();
        return Object.values(modules).filter(m => m.status === 'done' && m.generated.trim()).length;
      },

      getTotalModuleCount: () => CONSTITUTION_MODULE_META.length,
    }),
    {
      name: 'constitution-engine-v1',
      partialize: (s) => ({
        projectName: s.projectName,
        complexity: s.complexity,
        modules: Object.fromEntries(
          Object.entries(s.modules).map(([k, v]) => [k, {
            inputs: v.inputs,
            generated: v.generated,
            status: v.status === 'generating' ? 'idle' : v.status, // reset generating on reload
            generatedAt: v.generatedAt,
          }])
        ),
        constitution: s.constitution,
        benchmarkReport: s.benchmarkReport,
        adversarialReport: s.adversarialReport,
      }),
    }
  )
);
