import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppStep =
  | "upload"
  | "objective"
  | "blueprint"
  | "writing"
  | "validate"
  | "export";

export interface Layer {
  name: string;
  purpose: string;
  position: number;
  dependencies: string[];
}

export interface VoiceProfile {
  tone: string;
  authority: string;
  style: string;
  keyPhrases: string[];
  forbiddenPatterns: string[];
}

export interface DocumentArchitecture {
  layers: Layer[];
  voice: VoiceProfile;
  patterns: string[];
  documentType: string;
  depthLevel: string;
}

export interface Chapter {
  id: string;
  title: string;
  intent: string;
  position: number;
  dependsOn: string[];
  estimatedLength: "short" | "medium" | "long" | "extensive";
  status: "pending" | "generating" | "done";
  content?: string;
}

export interface GlobalRules {
  identity: string;
  tone: string;
  voice: string;
  forbiddenLanguage: string[];
  mandatoryElements: string[];
  qualityCriteria: string[];
}

export interface DocumentBlueprint {
  title: string;
  objective: string;
  audience: string;
  chapters: Chapter[];
  globalRules: GlobalRules;
}

export interface ValidationIssue {
  severity: "low" | "medium" | "high";
  location: string;
  description: string;
  suggestion: string;
}

export interface ValidationReport {
  score: number;
  contradictions: ValidationIssue[];
  gaps: ValidationIssue[];
  repetitions: ValidationIssue[];
  suggestions: string[];
  overallVerdict: string;
}

interface ProjectState {
  step: AppStep;
  referenceText: string;
  architecture: DocumentArchitecture | null;
  objective: string;
  sessionId: string | null;
  blueprint: DocumentBlueprint | null;
  validationReport: ValidationReport | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  setStep: (step: AppStep) => void;
  setReferenceText: (text: string) => void;
  setArchitecture: (arch: DocumentArchitecture) => void;
  setObjective: (obj: string) => void;
  setSession: (id: string, blueprint: DocumentBlueprint) => void;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
  updateBlueprint: (blueprint: DocumentBlueprint) => void;
  setValidationReport: (report: ValidationReport) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  step: "upload" as AppStep,
  referenceText: "",
  architecture: null,
  objective: "",
  sessionId: null,
  blueprint: null,
  validationReport: null,
  isLoading: false,
  loadingMessage: "",
  error: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      setReferenceText: (referenceText) => set({ referenceText }),
      setArchitecture: (architecture) => set({ architecture }),
      setObjective: (objective) => set({ objective }),
      setSession: (sessionId, blueprint) =>
        set({ sessionId, blueprint, step: "blueprint" }),
      updateChapter: (chapterId, updates) =>
        set((state) => {
          if (!state.blueprint) return state;
          return {
            blueprint: {
              ...state.blueprint,
              chapters: state.blueprint.chapters.map((c) =>
                c.id === chapterId ? { ...c, ...updates } : c
              ),
            },
          };
        }),
      updateBlueprint: (blueprint) => set({ blueprint }),
      setValidationReport: (validationReport) => set({ validationReport }),
      setLoading: (isLoading, loadingMessage = "") =>
        set({ isLoading, loadingMessage }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: "forge-project",
      partializer: (state) => ({
        step: state.step,
        referenceText: state.referenceText,
        objective: state.objective,
        sessionId: state.sessionId,
        blueprint: state.blueprint,
      }),
    }
  )
);
