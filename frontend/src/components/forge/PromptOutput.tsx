import { useState } from 'react';
import { Copy, Check, RefreshCw, Star, ChevronDown, ChevronUp, BarChart2, Download } from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { MODULES, AI_MODELS, BUILD_LEVELS } from '../../data/modules';

export function PromptOutput() {
  const { generatedPrompt, selectedModule, setView, resetParameters } = usePromptStore();
  const [copied, setCopied] = useState(false);
  const [showQuality, setShowQuality] = useState(true);

  const module = MODULES.find((m) => m.id === selectedModule);
  const model = AI_MODELS.find((m) => m.id === generatedPrompt?.targetModel);
  const level = BUILD_LEVELS.find((l) => l.id === generatedPrompt?.level);

  if (!generatedPrompt) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNew = () => {
    resetParameters();
    setView('builder');
  };

  const handleDownload = () => {
    const filename = `prompt_${generatedPrompt.module}_${generatedPrompt.level}_${Date.now()}.txt`;
    const content = [
      `PROMPT FORGE — Generated Prompt`,
      `Module: ${generatedPrompt.module} | Level: ${generatedPrompt.level} | Model: ${generatedPrompt.targetModel}`,
      `Quality Score: ${generatedPrompt.quality.score}/100`,
      `Generated: ${new Date(generatedPrompt.createdAt).toLocaleString()}`,
      ``,
      `─── PROMPT ───────────────────────────────────────────────`,
      ``,
      generatedPrompt.prompt,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const q = generatedPrompt.quality;
  const criteriaItems = [
    { label: 'Clareza', value: q.criteria.clarity },
    { label: 'Precisão', value: q.criteria.precision },
    { label: 'Contexto', value: q.criteria.context },
    { label: 'Estrutura', value: q.criteria.structure },
    { label: 'Especificidade', value: q.criteria.specificity },
    { label: 'Coerência', value: q.criteria.coherence },
  ];

  const scoreColor =
    q.score >= 85 ? '#10b981' : q.score >= 65 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex-1 overflow-auto px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {module && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ color: module.accentColor, borderColor: `${module.accentColor}40`, background: `${module.accentColor}10` }}
            >
              {module.icon} {module.name}
            </span>
          )}
          {level && (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ color: level.color, borderColor: `${level.color}40`, background: `${level.color}10` }}
            >
              {level.name}
            </span>
          )}
          {model && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-white/60">
              🎯 {model.name}
            </span>
          )}
        </div>

        {/* Quality score */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => setShowQuality(!showQuality)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <BarChart2 size={16} style={{ color: scoreColor }} />
              <span className="text-sm font-semibold text-white/70">Qualidade do Prompt</span>
              {/* Score ring */}
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="3"
                    strokeDasharray={`${(q.score / 100) * 94} 94`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: scoreColor }}>
                  {q.score}
                </span>
              </div>
            </div>
            {showQuality ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
          </button>

          {showQuality && (
            <div className="px-5 pb-5 space-y-4">
              {/* Criteria bars */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {criteriaItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/40">{item.label}</span>
                      <span className="text-white/60">{item.value}</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.value}%`,
                          background: item.value >= 80 ? '#10b981' : item.value >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Issues */}
              {q.issues.length > 0 && (
                <div>
                  <div className="text-xs text-white/30 mb-2">⚠ Pontos de Melhoria</div>
                  <ul className="space-y-1">
                    {q.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-amber-400/70 flex gap-2">
                        <span>•</span><span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {q.suggestions.length > 0 && (
                <div>
                  <div className="text-xs text-white/30 mb-2">💡 Sugestões</div>
                  <ul className="space-y-1">
                    {q.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-400/70 flex gap-2">
                        <span>•</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Prompt output */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Star size={14} className="text-indigo-400" />
              <span className="font-medium">Prompt Gerado</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-white/[0.06] hover:bg-white/[0.10] text-white/60 hover:text-white"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          <div className="p-5">
            <pre className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {generatedPrompt.prompt}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <button
            onClick={handleNew}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            <RefreshCw size={15} />
            Novo
          </button>
          <button
            onClick={handleDownload}
            title="Descarregar como .txt"
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-white/[0.08] text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
          >
            <Download size={15} />
            .txt
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-bold transition-all"
            style={{
              background: module
                ? `linear-gradient(135deg, ${module.accentColor}, #6366f1)`
                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: module ? `0 0 24px ${module.accentColor}30` : undefined,
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copiado!' : 'Copiar Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
