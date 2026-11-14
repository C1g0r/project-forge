import { Zap, ChevronLeft } from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';

export function Header() {
  const { view, setView, reset } = usePromptStore();

  const handleBack = () => {
    if (view === 'output') setView('builder');
    else if (view === 'builder') setView('home');
  };

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        {view !== 'home' && (
          <button
            onClick={handleBack}
            className="mr-1 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap size={16} className="text-white" />
            </div>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 blur-md opacity-40 group-hover:opacity-60 transition-opacity" />
          </div>
          <div>
            <span className="text-white font-semibold tracking-wide text-sm">
              PROMPT<span className="text-indigo-400"> FORGE</span>
            </span>
          </div>
        </button>
      </div>

      {/* Center breadcrumb */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-white/30">
        <span
          className={view === 'home' ? 'text-white/70' : 'hover:text-white/50 cursor-pointer transition-colors'}
          onClick={() => view !== 'home' && reset()}
        >
          Módulos
        </span>
        {view !== 'home' && (
          <>
            <span>/</span>
            <span
              className={view === 'builder' ? 'text-white/70' : 'hover:text-white/50 cursor-pointer transition-colors'}
              onClick={() => view === 'output' && setView('builder')}
            >
              Builder
            </span>
          </>
        )}
        {view === 'output' && (
          <>
            <span>/</span>
            <span className="text-white/70">Output</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          v2.0 BETA
        </div>
      </div>
    </header>
  );
}
