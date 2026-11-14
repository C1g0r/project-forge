import { useEffect } from 'react';
import { X, Trash2, Clock, ArrowRight } from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { MODULES, AI_MODELS } from '../../data/modules';
import type { GeneratedPrompt } from '../../types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#f59e0b';
  return '#ef4444';
}

interface HistoryCardProps {
  item: GeneratedPrompt;
  onRestore: (p: GeneratedPrompt) => void;
}

function HistoryCard({ item, onRestore }: HistoryCardProps) {
  const module = MODULES.find((m) => m.id === item.module);
  const model = AI_MODELS.find((m) => m.id === item.targetModel);
  const color = scoreColor(item.quality.score);

  return (
    <button
      onClick={() => onRestore(item)}
      className="w-full text-left group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all p-3.5 space-y-2.5"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{module?.icon ?? '⚡'}</span>
          <span className="text-xs font-semibold text-white/70">{module?.name ?? item.module}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Quality badge */}
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-md"
            style={{ color, background: `${color}18` }}
          >
            {item.quality.score}
          </span>
          <ArrowRight
            size={13}
            className="text-white/20 group-hover:text-white/60 transition-colors"
          />
        </div>
      </div>

      {/* Prompt preview */}
      <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
        {item.prompt}
      </p>

      {/* Bottom meta */}
      <div className="flex items-center justify-between text-[10px] text-white/25">
        <span>{model?.name ?? item.targetModel}</span>
        <span className="uppercase tracking-wide">{item.level}</span>
        <span>{timeAgo(item.createdAt)}</span>
      </div>
    </button>
  );
}

export function HistorySidebar() {
  const { showHistory, setShowHistory, history, clearHistory, restoreFromHistory } =
    usePromptStore();

  // Close on Escape
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHistory(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showHistory, setShowHistory]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 transition-all duration-300"
        style={{
          background: showHistory ? 'rgba(0,0,0,0.5)' : 'transparent',
          pointerEvents: showHistory ? 'auto' : 'none',
          backdropFilter: showHistory ? 'blur(2px)' : 'none',
        }}
        onClick={() => setShowHistory(false)}
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 h-full z-40 flex flex-col border-l border-white/[0.08] transition-transform duration-300"
        style={{
          width: '340px',
          background: 'rgba(8, 8, 20, 0.97)',
          transform: showHistory ? 'translateX(0)' : 'translateX(100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Clock size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white/80">Histórico</span>
            {history.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                title="Limpar histórico"
                className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setShowHistory(false)}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                <Clock size={20} className="text-white/20" />
              </div>
              <div>
                <p className="text-sm text-white/30 font-medium">Sem histórico</p>
                <p className="text-xs text-white/15 mt-1">
                  Os prompts gerados aparecem aqui
                </p>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <HistoryCard key={item.id} item={item} onRestore={restoreFromHistory} />
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/20 text-center">
              Últimos {history.length} prompts · clica para restaurar
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
