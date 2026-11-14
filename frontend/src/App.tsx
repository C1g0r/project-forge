import { usePromptStore } from './store/usePromptStore';
import { Header } from './components/forge/Header';
import { ModuleGrid } from './components/forge/ModuleGrid';
import { PromptBuilder } from './components/forge/PromptBuilder';
import { PromptOutput } from './components/forge/PromptOutput';

export default function App() {
  const { view } = usePromptStore();

  return (
    <div
      className="min-h-screen flex flex-col text-white overflow-hidden"
      style={{ background: '#080810' }}
    >
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-5"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 60%)' }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* App shell */}
      <div className="relative z-10 flex flex-col h-screen">
        <Header />

        <main className="flex-1 overflow-hidden flex flex-col">
          {view === 'home' && <ModuleGrid />}
          {view === 'builder' && <PromptBuilder />}
          {view === 'output' && <PromptOutput />}
        </main>
      </div>
    </div>
  );
}
