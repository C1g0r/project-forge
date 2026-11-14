import { usePromptStore } from '../../store/usePromptStore';
import { MODULES } from '../../data/modules';

export function ModuleGrid() {
  const { setSelectedModule, setView } = usePromptStore();

  const handleSelect = (moduleId: string) => {
    setSelectedModule(moduleId as Parameters<typeof setSelectedModule>[0]);
    setView('builder');
  };

  return (
    <div className="flex-1 overflow-auto px-6 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
          ⚡ INTELLIGENT PROMPT ENGINE — 10 PHASES
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          Escolhe o teu <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">módulo de criação</span>
        </h1>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Prompts profissionais gerados por IA, optimizados para cada modelo e cada área criativa.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
        {MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => handleSelect(mod.id)}
            className="group relative p-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200 text-left overflow-hidden"
            style={{ '--accent': mod.accentColor } as React.CSSProperties}
          >
            {/* Glow on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: `radial-gradient(circle at 50% 0%, ${mod.accentColor}18 0%, transparent 70%)` }}
            />

            {/* Accent top line */}
            <div
              className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: `linear-gradient(90deg, transparent, ${mod.accentColor}80, transparent)` }}
            />

            {/* Icon */}
            <div className="text-3xl mb-3 leading-none">{mod.icon}</div>

            {/* Content */}
            <div className="relative">
              <div className="font-semibold text-white/90 text-sm leading-tight mb-1 group-hover:text-white transition-colors">
                {mod.name.replace(/ STUDIO| & RESEARCH| & AGENTS| & TECHNICAL| & DEV STUDIO| & SPEECH STUDIO| PROMPT/, '')}
              </div>
              <div className="text-white/35 text-xs leading-relaxed line-clamp-2">
                {mod.tagline}
              </div>
            </div>

            {/* Subcategory count */}
            <div
              className="absolute bottom-3 right-4 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ color: mod.accentColor }}
            >
              {mod.subcategories.length} áreas →
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-10 text-white/20 text-xs">
        © 2026 C1g0r — All rights reserved
      </div>
    </div>
  );
}
