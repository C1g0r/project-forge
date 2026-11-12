import { useState } from "react";
import { Edit3, ChevronRight, GripVertical, Clock, FileText, Zap } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { updateBlueprintRemote } from "../lib/api";
import type { Chapter } from "../store/projectStore";

const lengthLabels = { short: "~300p", medium: "~800p", long: "~1500p", extensive: "~3000p" };
const lengthColors = {
  short: "text-green-400",
  medium: "text-yellow-400",
  long: "text-orange-400",
  extensive: "text-red-400",
};

export function BlueprintEditor() {
  const { blueprint, sessionId, setStep, setLoading, setError, isLoading, updateBlueprint } = useProjectStore();
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIntent, setEditIntent] = useState("");

  if (!blueprint) return null;

  const startEdit = (ch: Chapter) => {
    setEditingChapter(ch.id);
    setEditTitle(ch.title);
    setEditIntent(ch.intent);
  };

  const saveEdit = () => {
    if (!editingChapter) return;
    const updated = {
      ...blueprint,
      chapters: blueprint.chapters.map((c) =>
        c.id === editingChapter ? { ...c, title: editTitle, intent: editIntent } : c
      ),
    };
    updateBlueprint(updated);
    setEditingChapter(null);
  };

  const handleProceed = async () => {
    if (!sessionId) return;
    setLoading(true, "A sincronizar arquitectura...");
    try {
      await updateBlueprintRemote(sessionId, blueprint);
      setStep("writing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setLoading(false);
    }
  };

  const totalWords = Object.values(lengthLabels).length; // placeholder
  const doneCount = blueprint.chapters.filter((c) => c.status === "done").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* header info */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-100 text-base sm:text-lg leading-tight">{blueprint.title}</h3>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1 line-clamp-2">{blueprint.objective}</p>
          </div>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded whitespace-nowrap shrink-0">
            {blueprint.chapters.length} cap.
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-zinc-500">Identidade</p>
            <p className="text-zinc-200 mt-0.5 line-clamp-2">{blueprint.globalRules.identity}</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-zinc-500">Tom</p>
            <p className="text-zinc-200 mt-0.5">{blueprint.globalRules.tone}</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-zinc-500">Audiência</p>
            <p className="text-zinc-200 mt-0.5">{blueprint.audience}</p>
          </div>
        </div>
      </div>

      {/* capítulos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Índice</p>
          <span className="text-xs text-zinc-500">{doneCount}/{blueprint.chapters.length} concluídos</span>
        </div>

        {blueprint.chapters.map((ch) => (
          <div
            key={ch.id}
            className={`border rounded-xl transition-colors
              ${ch.status === "done" ? "border-violet-500/30 bg-violet-500/5" : "border-zinc-800 bg-zinc-900"}`}
          >
            {editingChapter === ch.id ? (
              <div className="p-3 space-y-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                />
                <textarea
                  value={editIntent}
                  onChange={(e) => setEditIntent(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="text-xs bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingChapter(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 sm:gap-3 p-3">
                <GripVertical size={14} className="text-zinc-700 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 font-mono shrink-0">{String(ch.position).padStart(2, "0")}</span>
                    <span className="text-sm font-medium text-zinc-100 truncate">{ch.title}</span>
                    {ch.status === "done" && (
                      <span className="text-xs text-violet-400 shrink-0">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 sm:line-clamp-1">{ch.intent}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs hidden sm:inline ${lengthColors[ch.estimatedLength]}`}>
                    {lengthLabels[ch.estimatedLength]}
                  </span>
                  <button
                    onClick={() => startEdit(ch)}
                    className="text-zinc-600 hover:text-zinc-300 active:text-zinc-200 p-1 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* legenda — desktop only */}
      <div className="hidden sm:flex gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1"><Clock size={11} /> Estimativa por capítulo:</span>
        <span className={lengthColors.short}>~300p curto</span>
        <span className={lengthColors.medium}>~800p médio</span>
        <span className={lengthColors.long}>~1500p longo</span>
        <span className={lengthColors.extensive}>~3000p extenso</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setStep("objective")}
          className="sm:w-auto w-full px-4 py-3 sm:py-2.5 text-zinc-400 hover:text-zinc-200 active:text-zinc-100
                     border border-zinc-700 hover:border-zinc-500 rounded-xl text-sm transition-colors text-center"
        >
          Voltar
        </button>
        <button
          onClick={handleProceed}
          disabled={isLoading}
          className="flex-1 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40
                     text-white font-medium py-3 sm:py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Zap size={16} />
          {isLoading ? "A sincronizar..." : "Começar a Escrever"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
