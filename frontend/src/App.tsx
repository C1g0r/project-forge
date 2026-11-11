import { useProjectStore } from "./store/projectStore";
import { UploadZone } from "./components/UploadZone";
import { ObjectiveInput } from "./components/ObjectiveInput";
import { BlueprintEditor } from "./components/BlueprintEditor";
import { ChapterEditor } from "./components/ChapterEditor";
import { ValidatorPanel } from "./components/ValidatorPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ContextSidebar } from "./components/ContextSidebar";
import { Zap, RotateCcw, AlertCircle, X } from "lucide-react";

const STEPS = [
  { id: "upload", label: "Referência" },
  { id: "objective", label: "Objectivo" },
  { id: "blueprint", label: "Índice" },
  { id: "writing", label: "Escrita" },
  { id: "validate", label: "Validar" },
  { id: "export", label: "Exportar" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const stepOrder: StepId[] = ["upload", "objective", "blueprint", "writing", "validate", "export"];

function StepBar({ current }: { current: StepId }) {
  const currentIdx = stepOrder.indexOf(current);
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors
              ${active ? "text-violet-300 bg-violet-500/10" : done ? "text-zinc-400" : "text-zinc-700"}`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold
                ${active ? "bg-violet-500 text-white" : done ? "bg-zinc-700 text-zinc-400" : "bg-zinc-800 text-zinc-700"}`}
              >
                {done ? "✓" : i + 1}
              </span>
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-4 ${done ? "bg-zinc-600" : "bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const { step, error, isLoading, loadingMessage, reset, setError } = useProjectStore();

  const renderMain = () => {
    switch (step) {
      case "upload": return <UploadZone />;
      case "objective": return <ObjectiveInput />;
      case "blueprint": return <BlueprintEditor />;
      case "writing": return <ChapterEditor />;
      case "validate": return <ValidatorPanel />;
      case "export": return <ExportPanel />;
      default: return <UploadZone />;
    }
  };

  const isWideStep = step === "writing";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      {/* topbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-violet-400" />
            <span className="font-bold text-zinc-100 tracking-tight">PROJECT FORGE</span>
            <span className="text-xs text-zinc-700 ml-1">v0.1</span>
          </div>

          <StepBar current={step} />

          <button
            onClick={() => { if (confirm("Recomeçar? Perderás todo o progresso.")) reset(); }}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </header>

      {/* error banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <X size={14} className="text-red-400 hover:text-red-200" />
            </button>
          </div>
        </div>
      )}

      {/* loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-300">{loadingMessage || "A processar..."}</p>
          </div>
        </div>
      )}

      {/* main layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className={`flex gap-6 ${isWideStep ? "h-[calc(100vh-10rem)]" : ""}`}>
          {/* center panel */}
          <div className={`flex-1 min-w-0 ${isWideStep ? "flex flex-col" : ""}`}>
            {renderMain()}
          </div>

          {/* right sidebar — hidden on writing step (has its own layout) */}
          {!isWideStep && (
            <aside className="w-56 shrink-0">
              <div className="sticky top-20 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-600 uppercase tracking-wider">Contexto</p>
                </div>
                <ContextSidebar />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
