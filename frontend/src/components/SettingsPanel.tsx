import { X, Archive, Trash2, RotateCcw, Clock } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import type { ChapterDraft } from "../store/projectStore";

interface Props {
  onClose: () => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SettingsPanel({ onClose }: Props) {
  const {
    chapterDrafts, sessionId, blueprint,
    updateChapter, clearChapterDrafts, setStep,
  } = useProjectStore();

  // Only show drafts for current session
  const sessionDrafts: [string, ChapterDraft][] = Object.entries(chapterDrafts)
    .filter(([key]) => sessionId && key.startsWith(`${sessionId}:`))
    .sort(([, a], [, b]) => b.savedAt - a.savedAt);

  const handleRestore = (draft: ChapterDraft) => {
    if (!blueprint) return;
    // Check if chapter still exists
    const chapter = blueprint.chapters.find((c) => c.id === draft.chapterId);
    if (!chapter) {
      alert("Capítulo não encontrado no plano actual.");
      return;
    }
    updateChapter(draft.chapterId, {
      status: "done",
      content: draft.content,
    });
    setStep("writing");
    onClose();
  };

  const handleClearAll = () => {
    if (confirm("Apagar todos os rascunhos guardados?")) {
      clearChapterDrafts();
    }
  };

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 z-50 flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-violet-400" />
            <span className="font-semibold text-zinc-100">Definições</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* autosave section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Rascunhos Guardados</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Guardamento automático de cada capítulo gerado
                </p>
              </div>
              {sessionDrafts.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={11} />
                  Limpar
                </button>
              )}
            </div>

            {sessionDrafts.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center">
                <Clock size={24} className="mx-auto text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-600">
                  Nenhum rascunho guardado ainda.
                </p>
                <p className="text-xs text-zinc-700 mt-1">
                  Os capítulos são guardados automaticamente durante a geração.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionDrafts.map(([key, draft]) => (
                  <div
                    key={key}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">
                          {draft.title}
                        </p>
                        <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {formatDate(draft.savedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(draft)}
                        className="shrink-0 flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/40
                                   text-violet-300 px-2 py-1 rounded transition-colors"
                      >
                        <RotateCcw size={10} />
                        Repor
                      </button>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                      {draft.content.substring(0, 120)}…
                    </p>
                    <p className="text-xs text-zinc-700">
                      {draft.content.split(" ").filter(Boolean).length} palavras
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* session info */}
          <section className="space-y-2">
            <p className="text-sm font-medium text-zinc-200">Sessão Actual</p>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 space-y-1.5 font-mono text-xs text-zinc-500">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-700">ID</span>
                <span className="truncate text-right">{sessionId ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-700">Capítulos</span>
                <span>{blueprint?.chapters.length ?? 0}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-700">Concluídos</span>
                <span>{blueprint?.chapters.filter((c) => c.status === "done").length ?? 0}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-700">Rascunhos</span>
                <span>{sessionDrafts.length}</span>
              </div>
            </div>
          </section>

          {/* storage note */}
          <section>
            <p className="text-xs text-zinc-700 leading-relaxed">
              Os dados são guardados localmente no browser (localStorage).
              Não são enviados para nenhum servidor externo além do necessário para gerar conteúdo.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
