import { useState, useRef, useEffect } from "react";
import { Play, Square, CheckCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { streamChapter } from "../lib/api";
import type { Chapter } from "../store/projectStore";

const statusIcon = {
  pending: <Clock size={14} className="text-zinc-600" />,
  generating: <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />,
  done: <CheckCircle size={14} className="text-emerald-400" />,
};

function ChapterCard({
  chapter,
  isActive,
  onGenerate,
  onSelect,
}: {
  chapter: Chapter;
  isActive: boolean;
  onGenerate: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-xl transition-all
        ${isActive ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 bg-zinc-900"}
        ${chapter.status === "done" ? "border-emerald-500/20" : ""}
      `}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => onSelect(chapter.id)}
      >
        <span className="shrink-0">{statusIcon[chapter.status]}</span>
        <span className="text-xs text-zinc-600 font-mono w-5 shrink-0">
          {String(chapter.position).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? "text-violet-200" : "text-zinc-200"}`}>
            {chapter.title}
          </p>
          <p className="text-xs text-zinc-600 truncate">{chapter.intent}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {chapter.status === "done" && (
            <span className="text-xs text-zinc-600">
              {chapter.content ? Math.round(chapter.content.split(" ").length) + "p" : ""}
            </span>
          )}
          {chapter.status === "pending" && (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerate(chapter.id); }}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-2 py-0.5 rounded transition-colors"
            >
              Gerar
            </button>
          )}
          {chapter.status === "done" && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>
      {expanded && chapter.content && (
        <div className="px-3 pb-3 border-t border-zinc-800">
          <div className="mt-2 text-xs text-zinc-400 leading-relaxed max-h-48 overflow-y-auto prose-sm whitespace-pre-wrap">
            {chapter.content.substring(0, 600)}
            {chapter.content.length > 600 && "…"}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChapterEditor() {
  const { blueprint, sessionId, updateChapter, setStep, setLoading, setError, saveChapterDraft } = useProjectStore();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamingContent]);

  if (!blueprint || !sessionId) return null;

  const chapters = blueprint.chapters;
  const doneCount = chapters.filter((c) => c.status === "done").length;
  const allDone = doneCount === chapters.length;

  const handleGenerate = async (chapterId: string) => {
    if (isStreaming) return;
    setActiveChapterId(chapterId);
    setStreamingContent("");
    setIsStreaming(true);

    updateChapter(chapterId, { status: "generating", content: "" });

    let accumulated = "";

    const cleanup = streamChapter(sessionId, chapterId, {
      onToken: (token) => {
        accumulated += token;
        setStreamingContent(accumulated);
        updateChapter(chapterId, { content: accumulated });
      },
      onDone: () => {
        updateChapter(chapterId, { status: "done", content: accumulated });
        saveChapterDraft(chapterId, accumulated);
        setIsStreaming(false);
        cleanupRef.current = null;
      },
      onError: (err) => {
        console.error("Stream error:", err);
        updateChapter(chapterId, { status: "pending" });
        setIsStreaming(false);
        setError("Erro ao gerar capítulo: " + err);
        cleanupRef.current = null;
      },
    });

    cleanupRef.current = cleanup;
  };

  const handleStop = () => {
    cleanupRef.current?.();
    if (activeChapterId) {
      updateChapter(activeChapterId, { status: "pending" });
    }
    setIsStreaming(false);
    setStreamingContent("");
    setActiveChapterId(null);
  };

  const handleGenerateAll = async () => {
    const pending = chapters.filter((c) => c.status === "pending");
    for (const ch of pending) {
      await new Promise<void>((resolve) => {
        setActiveChapterId(ch.id);
        setStreamingContent("");
        setIsStreaming(true);
        updateChapter(ch.id, { status: "generating", content: "" });
        let accumulated = "";

        const cleanup = streamChapter(sessionId, ch.id, {
          onToken: (token) => {
            accumulated += token;
            setStreamingContent(accumulated);
            updateChapter(ch.id, { content: accumulated });
          },
          onDone: () => {
            updateChapter(ch.id, { status: "done", content: accumulated });
            saveChapterDraft(ch.id, accumulated);
            setIsStreaming(false);
            cleanupRef.current = null;
            resolve();
          },
          onError: (err) => {
            updateChapter(ch.id, { status: "pending" });
            setIsStreaming(false);
            setError("Erro: " + err);
            cleanupRef.current = null;
            resolve();
          },
        });
        cleanupRef.current = cleanup;
      });
    }
  };

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* lista de capítulos */}
      <div className="lg:w-72 shrink-0 space-y-2 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {doneCount}/{chapters.length} capítulos
          </p>
          {!isStreaming && doneCount < chapters.length && (
            <button
              onClick={handleGenerateAll}
              className="text-xs text-violet-400 hover:text-violet-300 active:text-violet-500 transition-colors"
            >
              Gerar todos
            </button>
          )}
          {isStreaming && (
            <button
              onClick={handleStop}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            >
              <Square size={10} />
              Parar
            </button>
          )}
        </div>

        {chapters.map((ch) => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            isActive={ch.id === activeChapterId}
            onGenerate={handleGenerate}
            onSelect={setActiveChapterId}
          />
        ))}

        <div className="pt-3 space-y-2">
          <button
            onClick={() => setStep("blueprint")}
            className="w-full text-zinc-500 hover:text-zinc-300 active:text-zinc-200 border border-zinc-800
                       hover:border-zinc-600 rounded-xl py-3 sm:py-2 text-sm transition-colors"
          >
            ← Índice
          </button>
          {allDone && (
            <button
              onClick={() => setStep("validate")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium
                         rounded-xl py-3 sm:py-2 text-sm transition-colors"
            >
              Validar Documento →
            </button>
          )}
        </div>
      </div>

      {/* painel de streaming — hidden on mobile when no chapter selected */}
      <div className={`flex-1 flex flex-col min-h-0 ${!activeChapterId ? "hidden lg:flex" : "flex"}`}>
        {activeChapterId ? (
          <>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-100 text-sm sm:text-base leading-tight">
                  {activeChapter?.title || ""}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{activeChapter?.intent}</p>
              </div>
              {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-violet-400 shrink-0">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                  A escrever...
                </div>
              )}
            </div>

            <div
              ref={streamRef}
              className="flex-1 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4
                         font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap min-h-48 lg:min-h-0"
            >
              {streamingContent ||
                (activeChapter?.content) ||
                <span className="text-zinc-700 italic">
                  {activeChapter?.status === "pending"
                    ? "Clica 'Gerar' para escrever este capítulo."
                    : ""}
                </span>
              }
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-violet-400 animate-pulse ml-0.5" />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
              <span>
                {(streamingContent || activeChapter?.content || "").split(" ").filter(Boolean).length} palavras
              </span>
              {!isStreaming && activeChapter?.status === "done" && (
                <button
                  onClick={() => handleGenerate(activeChapterId)}
                  className="text-zinc-500 hover:text-violet-400 active:text-violet-500 transition-colors"
                >
                  Regenerar
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-700 text-sm">
            <div className="text-center space-y-2">
              <Play size={32} className="mx-auto text-zinc-800" />
              <p>Selecciona um capítulo para gerar</p>
              <p className="text-xs text-zinc-800">ou clica "Gerar todos"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
