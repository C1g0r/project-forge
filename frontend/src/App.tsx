import { useState, useEffect } from "react";
import { useProjectStore } from "./store/projectStore";
import { UploadZone } from "./components/UploadZone";
import { ObjectiveInput } from "./components/ObjectiveInput";
import { BlueprintEditor } from "./components/BlueprintEditor";
import { ChapterEditor } from "./components/ChapterEditor";
import { ValidatorPanel } from "./components/ValidatorPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ContextSidebar } from "./components/ContextSidebar";
import { SettingsPanel } from "./components/SettingsPanel";
import {
  Zap, RotateCcw, AlertCircle, X, ChevronLeft, ChevronRight, Settings,
} from "lucide-react";
import { STEP_ORDER } from "./store/projectStore";

const STEPS = [
  { id: "upload", label: "Referência" },
  { id: "objective", label: "Objectivo" },
  { id: "blueprint", label: "Índice" },
  { id: "writing", label: "Escrita" },
  { id: "validate", label: "Validar" },
  { id: "export", label: "Exportar" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function LoadingOverlay({ message, onCancel }: { message: string; onCancel: () => void }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const isLong = elapsed >= 10;
  const isVeryLong = elapsed >= 25;

  const statusMsg = isVeryLong
    ? "Servidor em hibernação — pode demorar até 60s na primeira utilização do dia"
    : isLong
    ? "A aguardar o servidor... pode estar a arrancar"
    : message || "A processar...";

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 flex flex-col items-center gap-4 w-full max-w-sm">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm text-zinc-300">{statusMsg}</p>
          {elapsed >= 5 && (
            <p className="text-xs text-zinc-600">{elapsed}s</p>
          )}
        </div>
        {elapsed >= 15 && (
          <button
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Cancelar e tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}

function StepBar({ current, onStepClick }: { current: StepId; onStepClick: (id: StepId) => void }) {
  const currentIdx = STEP_ORDER.indexOf(current);
  return (
    <div className="flex items-center overflow-x-auto scrollbar-none gap-0 py-0.5">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = step.id === current;
        const clickable = done;
        return (
          <div key={step.id} className="flex items-center shrink-0">
            <button
              onClick={() => clickable && onStepClick(step.id)}
              disabled={!clickable}
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap
                ${active ? "text-violet-300 bg-violet-500/10" : done ? "text-zinc-400 hover:text-zinc-200 cursor-pointer" : "text-zinc-700 cursor-default"}`}
            >
              <span className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold shrink-0
                ${active ? "bg-violet-500 text-white" : done ? "bg-zinc-700 text-zinc-400" : "bg-zinc-800 text-zinc-700"}`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-2 sm:w-4 shrink-0 ${done ? "bg-zinc-600" : "bg-zinc-800"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const {
    step, error, isLoading, loadingMessage,
    reset, setError, setStep,
    goBack, goForward, canGoBack, canGoForward,
  } = useProjectStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-11 sm:h-12 flex items-center gap-2 sm:gap-4">

          {/* back/forward */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={goBack}
              disabled={!canGoBack()}
              title="Passo anterior"
              className="w-7 h-7 flex items-center justify-center rounded
                         text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800
                         disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={goForward}
              disabled={!canGoForward()}
              title="Próximo passo"
              className="w-7 h-7 flex items-center justify-center rounded
                         text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800
                         disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* logo — hidden on xs to save space */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <Zap size={16} className="text-violet-400" />
            <span className="font-bold text-zinc-100 tracking-tight text-sm">PROJECT FORGE</span>
            <span className="text-xs text-zinc-700">v2.0</span>
          </div>

          {/* stepbar — takes remaining space */}
          <div className="flex-1 min-w-0">
            <StepBar current={step as StepId} onStepClick={(id) => setStep(id)} />
          </div>

          {/* right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowSettings(true)}
              title="Definições"
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <Settings size={15} />
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset"
              className="w-7 h-7 flex items-center justify-center rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* error banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-3 sm:px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 flex-1">{error}</p>
            {error.startsWith("Sessão expirada") && (
              <button
                onClick={() => { setError(null); reset(); }}
                className="shrink-0 text-xs text-red-300 hover:text-white underline underline-offset-2 transition-colors"
              >
                Recomeçar
              </button>
            )}
            <button onClick={() => setError(null)} className="shrink-0 ml-1">
              <X size={14} className="text-red-400 hover:text-red-200" />
            </button>
          </div>
        </div>
      )}

      {/* loading overlay */}
      {isLoading && (
        <LoadingOverlay
          message={loadingMessage}
          onCancel={() => useProjectStore.getState().setLoading(false)}
        />
      )}

      {/* settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* reset confirmation modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Recomeçar?</h3>
            <p className="text-xs text-zinc-400 mb-4">Perderás todo o progresso desta sessão.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowResetConfirm(false); reset(); window.location.reload(); }}
                className="px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
              >
                Recomeçar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-zinc-950/60 z-30 lg:hidden"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-72 bg-zinc-900 border-l border-zinc-800 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Contexto</p>
              <button onClick={() => setShowSidebar(false)}>
                <X size={14} className="text-zinc-500" />
              </button>
            </div>
            <ContextSidebar />
          </div>
        </div>
      )}

      {/* main layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        <div className={`flex gap-4 lg:gap-6 ${isWideStep ? "h-[calc(100vh-7rem)] sm:h-[calc(100vh-10rem)]" : ""}`}>

          {/* center panel */}
          <div className={`flex-1 min-w-0 ${isWideStep ? "flex flex-col" : ""}`}>
            {renderMain()}
          </div>

          {/* right sidebar — desktop only, hidden on writing step */}
          {!isWideStep && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-16 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
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
