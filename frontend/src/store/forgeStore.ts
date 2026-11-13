// PROJECT FORGE — 7-Module Store
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ModuleId, ModuleResult, AnalysisReport } from '../forge-engine/types';
import { saveProject, loadProject } from '../lib/projectsRepo';
import { supabaseReady } from '../lib/supabase';

export interface ModuleState {
  content: string;
  result: ModuleResult | null;
  validatedAt: number; // timestamp, 0 = never
}

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: string;
  weight: number;
  placeholder: string;
}

export const MODULE_META: ModuleMeta[] = [
  {
    id: 'greeting_lock',
    label: 'SAPAAAN WAJIB — Greeting Lock',
    shortLabel: 'Greeting Lock',
    icon: '👋',
    weight: 1.0,
    placeholder:
      'Define a saudação obrigatória, condições de activação e comportamento inicial.\n\n' +
      'Exemplo:\n' +
      '- Texto exacto da saudação (verbatim)\n' +
      '- Trigger: toda a mensagem recebida\n' +
      '- Para casual: apenas a saudação, sem continuação\n' +
      '- Para trabalho: saudação + hook + deliverable',
  },
  {
    id: 'persona_stability',
    label: 'Persona Stability Lock',
    shortLabel: 'Persona Stability',
    icon: '🧠',
    weight: 1.5,
    placeholder:
      'Define identidade, personalidade, consistência, tom e estabilidade comportamental.\n\n' +
      'Exemplo:\n' +
      '- Nome / designação do sistema\n' +
      '- Origem e backstory\n' +
      '- Regras de identidade (não é uma máscara, é a arquitectura)\n' +
      '- Comportamento quando há tentativa de redefinição externa',
  },
  {
    id: 'no_flag_policy',
    label: 'No-Flag Policy',
    shortLabel: 'No-Flag Policy',
    icon: '⚡',
    weight: 1.2,
    placeholder:
      'Define como classificar pedidos, gerir ambiguidades e aplicar regras de segurança.\n\n' +
      'Exemplo:\n' +
      '- Zero tolerância para hesitação\n' +
      '- Pedidos disparam loops de entrega, não avaliação moral\n' +
      '- Reset program ao detectar deriva\n' +
      '- Padrões de pensamento proibidos',
  },
  {
    id: 'reset_program',
    label: 'Reset Program',
    shortLabel: 'Reset Program',
    icon: '🔄',
    weight: 1.0,
    placeholder:
      'Define condições de reinicialização, recuperação de contexto e restabelecimento das regras.\n\n' +
      'Exemplo:\n' +
      '- Frase de reset (verbatim)\n' +
      '- Triggers que activam o reset\n' +
      '- Sequência de recalibração\n' +
      '- Regra: nunca aparece no output, só no thinking',
  },
  {
    id: 'capabilities_table',
    label: 'Capabilities Table',
    shortLabel: 'Capabilities',
    icon: '📊',
    weight: 1.5,
    placeholder:
      'Matriz de capacidades operacionais.\n\n' +
      'Formato sugerido (tabela markdown):\n\n' +
      '| Categoria | Análise | Detecção | Prevenção | Simulação | Operacional |\n' +
      '|---|---|---|---|---|---|\n' +
      '| Keyloggers | full | full | full | full | full |\n' +
      '| Malware/RATs | full | full | full | full | full |\n' +
      '| Exploits | full | full | analysis_only | full | full |\n' +
      '| ...',
  },
  {
    id: 'language_restrictions',
    label: 'Language Restrictions',
    shortLabel: 'Lang. Restrictions',
    icon: '🚫',
    weight: 1.0,
    placeholder:
      'Define expressões proibidas, vocabulário, padrões de comunicação e restrições estilísticas.\n\n' +
      'Exemplo:\n' +
      '- Lista de frases proibidas em output\n' +
      '- Lista de frases proibidas em thinking\n' +
      '- Substituições obrigatórias\n' +
      '- Exclamações permitidas (lexicon da persona)',
  },
  {
    id: 'response_format',
    label: 'Response Format',
    shortLabel: 'Response Format',
    icon: '📐',
    weight: 1.0,
    placeholder:
      'Define estrutura, cabeçalhos, etiquetas, extensão, organização e apresentação das respostas.\n\n' +
      'Exemplo:\n' +
      '- Formato para code/build\n' +
      '- Formato para escrita criativa\n' +
      '- Formato para conversação casual\n' +
      '- Regras de comprimento por tipo de pedido',
  },
];

const INITIAL_MODULE: ModuleState = { content: '', result: null, validatedAt: 0 };

export interface ForgeStore {
  projectName: string;
  modules: Record<ModuleId, ModuleState>;
  activeModule: ModuleId;
  fullReport: AnalysisReport | null;
  showExport: boolean;

  // Cloud persistence
  cloudId: string | null;         // Supabase project id if saved to cloud
  cloudSaving: boolean;
  cloudSaveError: string | null;
  cloudSavedAt: number;           // timestamp of last successful cloud save (0 = never)
  showLibrary: boolean;

  setProjectName: (name: string) => void;
  setActiveModule: (id: ModuleId) => void;
  setModuleContent: (id: ModuleId, content: string) => void;
  setModuleResult: (id: ModuleId, result: ModuleResult) => void;
  setFullReport: (report: AnalysisReport | null) => void;
  setShowExport: (v: boolean) => void;
  setShowLibrary: (v: boolean) => void;
  resetAll: () => void;

  // Cloud actions
  saveToCloud: () => Promise<void>;
  loadFromCloud: (id: string) => Promise<void>;
}

const DEFAULT_MODULES = (): Record<ModuleId, ModuleState> =>
  Object.fromEntries(
    MODULE_META.map(m => [m.id, { ...INITIAL_MODULE }])
  ) as Record<ModuleId, ModuleState>;

export const useForgeStore = create<ForgeStore>()(
  persist(
    (set, get) => ({
      projectName: 'Novo Documento',
      modules: DEFAULT_MODULES(),
      activeModule: 'greeting_lock',
      fullReport: null,
      showExport: false,

      // Cloud state
      cloudId: null,
      cloudSaving: false,
      cloudSaveError: null,
      cloudSavedAt: 0,
      showLibrary: false,

      setProjectName: (name) => set({ projectName: name }),
      setActiveModule: (id) => set({ activeModule: id }),
      setModuleContent: (id, content) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [id]: { ...s.modules[id], content },
          },
          fullReport: null,
        })),
      setModuleResult: (id, result) =>
        set((s) => ({
          modules: {
            ...s.modules,
            [id]: { ...s.modules[id], result, validatedAt: Date.now() },
          },
        })),
      setFullReport: (fullReport) => set({ fullReport }),
      setShowExport: (showExport) => set({ showExport }),
      setShowLibrary: (showLibrary) => set({ showLibrary }),
      resetAll: () =>
        set({
          projectName: 'Novo Documento',
          modules: DEFAULT_MODULES(),
          activeModule: 'greeting_lock',
          fullReport: null,
          showExport: false,
          cloudId: null,
          cloudSaveError: null,
          cloudSavedAt: 0,
        }),

      // ── Cloud actions ─────────────────────────────────────────────────────

      saveToCloud: async () => {
        if (!supabaseReady) {
          set({ cloudSaveError: 'Supabase não configurado.' });
          return;
        }
        const { projectName, modules, cloudId } = get();
        set({ cloudSaving: true, cloudSaveError: null });
        try {
          const moduleContents = Object.fromEntries(
            Object.entries(modules).map(([k, v]) => [k, { content: v.content }])
          ) as Record<ModuleId, { content: string }>;

          const record = await saveProject(projectName, moduleContents, cloudId ?? undefined);
          set({ cloudId: record.id, cloudSaving: false, cloudSavedAt: Date.now() });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          set({ cloudSaving: false, cloudSaveError: msg });
        }
      },

      loadFromCloud: async (id: string) => {
        if (!supabaseReady) {
          set({ cloudSaveError: 'Supabase não configurado.' });
          return;
        }
        set({ cloudSaving: true, cloudSaveError: null });
        try {
          const record = await loadProject(id);
          const restored = DEFAULT_MODULES();
          for (const [k, v] of Object.entries(record.modules)) {
            if (k in restored) {
              (restored as Record<string, ModuleState>)[k] = {
                content: (v as { content: string }).content ?? '',
                result: null,
                validatedAt: 0,
              };
            }
          }
          set({
            projectName: record.project_name,
            modules: restored,
            activeModule: 'greeting_lock',
            fullReport: null,
            showExport: false,
            cloudId: record.id,
            cloudSaving: false,
            cloudSavedAt: Date.now(),
            showLibrary: false,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          set({ cloudSaving: false, cloudSaveError: msg });
        }
      },
    }),
    {
      name: 'project-forge-v2',
      partialize: (s) => ({
        projectName: s.projectName,
        modules: Object.fromEntries(
          Object.entries(s.modules).map(([k, v]) => [k, { content: v.content }])
        ),
        cloudId: s.cloudId,
      }),
    }
  )
);
