import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppStep =
  | "upload"
  | "objective"
  | "blueprint"
  | "writing"
  | "validate"
  | "export";

export const STEP_ORDER: AppStep[] = [
  "upload",
  "objective",
  "blueprint",
  "writing",
  "validate",
  "export",
];

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

// Draft autosave: keyed by sessionId+chapterId, persisted separately
export interface ChapterDraft {
  chapterId: string;
  title: string;
  content: string;
  savedAt: number; // timestamp
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
  // Chapter drafts for recovery (autosaved)
  chapterDrafts: Record<string, ChapterDraft>; // key: `${sessionId}:${chapterId}`

  setStep: (step: AppStep) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  setReferenceText: (text: string) => void;
  setArchitecture: (arch: DocumentArchitecture) => void;
  setObjective: (obj: string) => void;
  setSession: (id: string, blueprint: DocumentBlueprint) => void;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
  updateBlueprint: (blueprint: DocumentBlueprint) => void;
  setValidationReport: (report: ValidationReport | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  saveChapterDraft: (chapterId: string, content: string) => void;
  clearChapterDrafts: () => void;
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
  chapterDrafts: {} as Record<string, ChapterDraft>,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      goBack: () => {
        const { step } = get();
        const idx = STEP_ORDER.indexOf(step);
        if (idx > 0) set({ step: STEP_ORDER[idx - 1] });
      },

      goForward: () => {
        const { step } = get();
        const idx = STEP_ORDER.indexOf(step);
        if (idx < STEP_ORDER.length - 1) set({ step: STEP_ORDER[idx + 1] });
      },

      canGoBack: () => {
        const { step } = get();
        return STEP_ORDER.indexOf(step) > 0;
      },

      canGoForward: () => {
        const { step, blueprint, sessionId, objective, referenceText } = get();
        const idx = STEP_ORDER.indexOf(step);
        if (idx >= STEP_ORDER.length - 1) return false;
        // Guard: only allow forward if current step has sufficient data
        switch (step) {
          case "upload": return referenceText.length > 50;
          case "objective": return objective.length > 10;
          case "blueprint": return !!sessionId && !!blueprint;
          case "writing": return !!blueprint?.chapters.some((c) => c.status === "done");
          case "validate": return true;
          default: return false;
        }
      },

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

      saveChapterDraft: (chapterId, content) => {
        const { sessionId, blueprint } = get();
        if (!sessionId || !content) return;
        const chapter = blueprint?.chapters.find((c) => c.id === chapterId);
        if (!chapter) return;
        const key = `${sessionId}:${chapterId}`;
        set((state) => ({
          chapterDrafts: {
            ...state.chapterDrafts,
            [key]: {
              chapterId,
              title: chapter.title,
              content,
              savedAt: Date.now(),
            },
          },
        }));
      },

      clearChapterDrafts: () => set({ chapterDrafts: {} }),

      reset: () => set(initialState),
    }),
    {
      name: "forge-project",
      partialize: (state) => ({
        step: state.step,
        referenceText: state.referenceText,
        objective: state.objective,
        sessionId: state.sessionId,
        blueprint: state.blueprint,
        chapterDrafts: state.chapterDrafts,
      }),
    }
  )
);
