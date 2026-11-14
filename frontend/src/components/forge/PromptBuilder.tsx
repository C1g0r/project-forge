import { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Target, Settings2, Cpu } from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { MODULES, AI_MODELS, BUILD_LEVELS } from '../../data/modules';

export function PromptBuilder() {
  const {
    selectedModule,
    selectedSubcategory,
    intent,
    parameters,
    buildLevel,
    targetModel,
    isGenerating,
    generationProgress,
    generationPhase,
    error,
    setSelectedSubcategory,
    setIntent,
    setParameter,
    setBuildLevel,
    setTargetModel,
    setView,
    startBuild,
    setGenerating,
    setGenerationProgress,
    setGeneratedPrompt,
    setError,
    addToHistory,
  } = usePromptStore();

  const [modelFilter, setModelFilter] = useState<'all' | 'cloud' | 'local' | string>('all');

  const module = MODULES.find((m) => m.id === selectedModule);
  if (!module) return null;

  const filteredModels = AI_MODELS.filter((m) => {
    if (modelFilter === 'cloud') return m.type === 'cloud';
    if (modelFilter === 'local') return m.type === 'local';
    if (modelFilter === 'all') return true;
    // Category filter
    return m.category === modelFilter;
  });

  const categories = ['all', 'universal', 'text', 'image', 'video', 'audio', 'cloud', 'local'];

  const handleGenerate = async () => {
    const request = startBuild();
    if (!request) {
      setError('Preenche todos os campos obrigatórios.');
      return;
    }

    setGenerating(true);
    setError(null);

    const phases = [
      'Analisando intenção...',
      'Extraindo requisitos...',
      'Aplicando inteligência de domínio...',
      'Configurando modelo alvo...',
      'Arquitectando prompt...',
      'Compilando prompt...',
      'Optimizando...',
      'Garantia de qualidade...',
      'Finalizando...',
    ];

    // Simulate phase progression
    let phaseIdx = 0;
    const phaseInterval = setInterval(() => {
      if (phaseIdx < phases.length) {
        setGenerationProgress(Math.round(((phaseIdx + 1) / phases.length) * 90), phases[phaseIdx]);
        phaseIdx++;
      }
    }, 400);

    try {
      const res = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      clearInterval(phaseInterval);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      setGenerationProgress(100, 'Concluído');
      setGeneratedPrompt(data);
      addToHistory(data);
      setView('output');
    } catch (err) {
      clearInterval(phaseInterval);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const canGenerate = selectedSubcategory && intent.trim().length > 10;

  return (
    <div className="flex-1 overflow-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Module badge */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{module.icon}</span>
          <div>
            <div className="text-lg font-bold text-white">{module.name}</div>
            <div className="text-white/40 text-sm">{module.tagline}</div>
          </div>
        </div>

        {/* Step 1 — Subcategory */}
        <Section icon={<Layers size={15} />} title="1. Área Específica" accent={module.accentColor}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {module.subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSelectedSubcategory(sub.id)}
                className={`px-3 py-2 rounded-xl text-sm text-left transition-all ${
                  selectedSubcategory === sub.id
                    ? 'text-white border'
                    : 'text-white/50 border border-white/[0.06] hover:text-white/80 hover:border-white/20'
                }`}
                style={
                  selectedSubcategory === sub.id
                    ? { borderColor: module.accentColor, background: `${module.accentColor}18`, color: 'white' }
                    : {}
                }
              >
                {sub.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Step 2 — Intent */}
        <Section icon={<Target size={15} />} title="2. Descreve a tua Intenção" accent={module.accentColor}>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Descreve com detalhe o que queres criar. Quanto mais específico fores, melhor será o prompt gerado..."
            rows={4}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 placeholder-white/20 text-sm resize-none focus:outline-none focus:border-white/20 transition-colors"
          />
          <div className="text-right text-white/20 text-xs mt-1">{intent.length} caracteres</div>
        </Section>

        {/* Step 3 — Parameters */}
        {module.parameters.length > 0 && (
          <Section icon={<Settings2 size={15} />} title="3. Parâmetros Avançados" accent={module.accentColor}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {module.parameters.map((param) => (
                <div key={param.id}>
                  <label className="text-xs text-white/40 mb-1.5 block">{param.label}</label>
                  {param.type === 'select' && param.options ? (
                    <div className="relative">
                      <select
                        value={parameters[param.id] ?? ''}
                        onChange={(e) => setParameter(param.id, e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 text-sm appearance-none focus:outline-none focus:border-white/20 transition-colors"
                      >
                        <option value="">— Escolher —</option>
                        {param.options.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0f0f17]">{opt}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  ) : param.type === 'textarea' ? (
                    <textarea
                      value={parameters[param.id] ?? ''}
                      onChange={(e) => setParameter(param.id, e.target.value)}
                      placeholder={param.placeholder}
                      rows={2}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 placeholder-white/20 text-sm resize-none focus:outline-none focus:border-white/20 transition-colors"
                    />
                  ) : (
                    <input
                      type="text"
                      value={parameters[param.id] ?? ''}
                      onChange={(e) => setParameter(param.id, e.target.value)}
                      placeholder={param.placeholder}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 placeholder-white/20 text-sm focus:outline-none focus:border-white/20 transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Step 4 — Model & Level */}
        <Section icon={<Cpu size={15} />} title="4. Modelo Alvo & Nível de Build" accent={module.accentColor}>
          {/* Build level */}
          <div className="mb-4">
            <div className="text-xs text-white/30 mb-2">Nível de Profundidade</div>
            <div className="grid grid-cols-4 gap-2">
              {BUILD_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setBuildLevel(lvl.id)}
                  title={lvl.detail}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                    buildLevel === lvl.id
                      ? 'text-white border-transparent'
                      : 'text-white/40 border-white/[0.06] hover:text-white/70'
                  }`}
                  style={
                    buildLevel === lvl.id
                      ? { background: `${lvl.color}25`, borderColor: `${lvl.color}60` }
                      : {}
                  }
                >
                  <div style={{ color: buildLevel === lvl.id ? lvl.color : undefined }}>{lvl.name}</div>
                  <div className="text-white/30 font-normal text-[10px] mt-0.5">{lvl.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Model filter tabs */}
          <div className="text-xs text-white/30 mb-2">Modelo Alvo</div>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setModelFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  modelFilter === cat
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-auto pr-1">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setTargetModel(model.id)}
                className={`px-3 py-2.5 rounded-xl text-left transition-all border ${
                  targetModel === model.id
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                    : 'border-white/[0.06] text-white/50 hover:text-white/80 hover:border-white/20'
                }`}
              >
                <div className="text-xs font-medium truncate">{model.name}</div>
                <div className="text-[10px] text-white/30 truncate">{model.provider}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        <div className="pb-4">
          {isGenerating ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/40">
                <span>{generationPhase}</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${generationProgress}%`,
                    background: `linear-gradient(90deg, ${module.accentColor}, #6366f1)`,
                  }}
                />
              </div>
              <div className="text-center text-white/30 text-xs">
                Motor Inteligente a processar 10 fases…
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={
                canGenerate
                  ? {
                      background: `linear-gradient(135deg, ${module.accentColor}, #6366f1)`,
                      boxShadow: `0 0 30px ${module.accentColor}30`,
                      color: 'white',
                    }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }
              }
            >
              ⚡ GERAR PROMPT — {buildLevel.toUpperCase()}
            </button>
          )}
          {!canGenerate && !isGenerating && (
            <p className="text-center text-white/20 text-xs mt-2">
              Escolhe uma área e descreve a tua intenção (mín. 10 caracteres)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]" style={{ color: accent }}>
        {icon}
        <span className="text-sm font-semibold text-white/70">{title}</span>
        <ChevronRight size={14} className="ml-auto text-white/20" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
