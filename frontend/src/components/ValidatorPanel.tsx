import { useState, useRef } from "react";
import { ShieldCheck, AlertTriangle, XCircle, Repeat, Lightbulb, ChevronDown, ChevronRight, Sparkles, CheckCircle2, Loader2, SkipForward } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { validateDocument, streamImproveDocument, SessionExpiredError } from "../lib/api";

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-zinc-500">/ 100</p>
      </div>
    </div>
  );
}

type IssueItem = string | { description?: string; text?: string; message?: string };

function IssueList({ title, items, icon, color }: {
  title: string;
  items: IssueItem[];
  icon: React.ReactNode;
  color: string;
}) {
  const [open, setOpen] = useState(true);
  if (!items.length) return null;

  const getText = (item: IssueItem): string => {
    if (typeof item === "string") return item;
    return item.description ?? item.text ?? item.message ?? JSON.stringify(item);
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 hover:bg-zinc-800/50 transition-colors"
      >
        <span className={color}>{icon}</span>
        <span className="font-medium text-sm text-zinc-200 flex-1 text-left">{title}</span>
        <span className="text-xs text-zinc-600 mr-2">{items.length}</span>
        {open ? <ChevronDown size={14} className="text-zinc-600" /> : <ChevronRight size={14} className="text-zinc-600" />}
      </button>
      {open && (
        <ul className="border-t border-zinc-800 divide-y divide-zinc-800/50">
          {items.map((item, i) => (
            <li key={i} className="px-4 py-2.5 text-xs text-zinc-400 leading-relaxed">
              {getText(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ChapterProgress = {
  chapterId: string;
  title: string;
  status: "pending" | "start" | "done" | "skip";
};

export function ValidatorPanel() {
  const { validationReport, sessionId, blueprint, setValidationReport, setStep, setLoading, setError, isLoading } = useProjectStore();
  const [ran, setRan] = useState(!!validationReport);
  const [improving, setImproving] = useState(false);
  const [improveProgress, setImproveProgress] = useState<ChapterProgress[]>([]);
  const [improveSummary, setImproveSummary] = useState<{ improvedCount: number; skippedCount: number } | null>(null);
  const stopImproveRef = useRef<(() => void) | null>(null);

  const handleImprove = () => {
    if (!sessionId) { setError("Sessão não encontrada."); return; }
    setError(null);
    setImproving(true);
    setImproveSummary(null);

    // Seed progress list from blueprint chapters
    const chaps = blueprint?.chapters ?? [];
    setImproveProgress(chaps.map((c) => ({ chapterId: c.id, title: c.title, status: "pending" as const })));

    stopImproveRef.current = streamImproveDocument(sessionId, {
      onChapter: (chapterId, title, status) => {
        setImproveProgress((prev) =>
          prev.map((p) => p.chapterId === chapterId ? { ...p, title, status } : p)
        );
      },
      onDone: (result) => {
        setImproveSummary(result);
        setImproving(false);
        // Clear validation report from store since backend cleared it
        setValidationReport(null);
        setRan(false);
      },
      onError: (e) => {
        setError(e);
        setImproving(false);
      },
    });
  };

  const handleValidate = async () => {
    if (!sessionId) {
      setError("Sessão não encontrada. Volta ao passo anterior.");
      return;
    }
    setError(null);
    setLoading(true, "A validar documento...");
    try {
      const report = await validateDocument(sessionId);
      if (!report || typeof report.score === "undefined") {
        throw new Error("Resposta inválida do servidor.");
      }
      setValidationReport(report);
      setRan(true);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : "Erro na validação");
      }
      setRan(false);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = blueprint?.chapters.reduce((acc, ch) => {
    return acc + (ch.content ? ch.content.split(" ").filter(Boolean).length : 0);
  }, 0) || 0;

  const doneChapters = blueprint?.chapters.filter((c) => c.status === "done").length || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* stats do documento */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 sm:p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-zinc-100">{doneChapters}</p>
          <p className="text-xs text-zinc-500 mt-0.5">capítulos</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 sm:p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-zinc-100">{wordCount.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-0.5">palavras</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 sm:p-3 text-center">
          <p className="text-xl sm:text-2xl font-bold text-zinc-100">{Math.round(wordCount / 250)}</p>
          <p className="text-xs text-zinc-500 mt-0.5">min leitura</p>
        </div>
      </div>

      {!ran ? (
        <div className="text-center space-y-4 py-8">
          <ShieldCheck size={48} className="mx-auto text-zinc-700" />
          <div>
            <p className="text-zinc-200 font-medium">Validação de Qualidade</p>
            <p className="text-zinc-500 text-sm mt-1">
              Analisa contradições, lacunas, repetições e coerência do documento.
            </p>
          </div>
          <button
            onClick={handleValidate}
            disabled={isLoading}
            className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 text-white
                       font-medium px-6 py-3 sm:py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? "A analisar..." : "Executar Validação"}
          </button>
        </div>
      ) : validationReport ? (
        <div className="space-y-3 sm:space-y-4">
          {/* score + verdict */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 flex items-center gap-4 sm:gap-6">
            <ScoreRing score={validationReport.score} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 mb-1">Veredito</p>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{validationReport.overallVerdict}</p>
            </div>
          </div>

          <IssueList
            title="Contradições"
            items={validationReport.contradictions}
            icon={<XCircle size={15} />}
            color="text-red-400"
          />
          <IssueList
            title="Lacunas"
            items={validationReport.gaps}
            icon={<AlertTriangle size={15} />}
            color="text-yellow-400"
          />
          <IssueList
            title="Repetições"
            items={validationReport.repetitions}
            icon={<Repeat size={15} />}
            color="text-orange-400"
          />
          <IssueList
            title="Sugestões"
            items={validationReport.suggestions}
            icon={<Lightbulb size={15} />}
            color="text-blue-400"
          />

          {/* Improve progress panel */}
          {(improving || improveSummary) && (
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-zinc-900 border-b border-zinc-800">
                <Sparkles size={15} className="text-violet-400" />
                <span className="text-sm font-medium text-zinc-200">
                  {improving ? "A melhorar capítulos..." : "Melhoria concluída"}
                </span>
                {improveSummary && (
                  <span className="ml-auto text-xs text-zinc-500">
                    {improveSummary.improvedCount} melhorados · {improveSummary.skippedCount} sem alterações
                  </span>
                )}
              </div>
              <ul className="divide-y divide-zinc-800/50 max-h-48 overflow-y-auto">
                {improveProgress.map((p) => (
                  <li key={p.chapterId} className="flex items-center gap-2 px-4 py-2 text-xs">
                    {p.status === "pending" && <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />}
                    {p.status === "start"   && <Loader2 size={14} className="text-violet-400 animate-spin shrink-0" />}
                    {p.status === "done"    && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                    {p.status === "skip"    && <SkipForward size={14} className="text-zinc-600 shrink-0" />}
                    <span className={
                      p.status === "done" ? "text-zinc-300" :
                      p.status === "start" ? "text-violet-300" :
                      p.status === "skip" ? "text-zinc-600" : "text-zinc-500"
                    }>{p.title}</span>
                  </li>
                ))}
              </ul>
              {improveSummary && (
                <div className="p-3 bg-zinc-900/50 border-t border-zinc-800">
                  <p className="text-xs text-zinc-400 text-center">
                    Documento melhorado. Executa a re-validação para confirmar a melhoria.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleValidate}
              className="sm:w-auto w-full text-zinc-500 hover:text-zinc-300 active:text-zinc-200 border border-zinc-800 hover:border-zinc-600
                         rounded-xl px-4 py-3 sm:py-2 text-sm transition-colors"
            >
              Re-validar
            </button>
            <button
              onClick={handleImprove}
              disabled={improving || isLoading}
              className="sm:flex-1 w-full bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 text-white font-medium
                         rounded-xl py-3 sm:py-2 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={15} />
              {improving ? "A melhorar..." : "Melhorar Documento"}
            </button>
            <button
              onClick={() => setStep("export")}
              className="sm:flex-1 w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium
                         rounded-xl py-3 sm:py-2 text-sm transition-colors"
            >
              Exportar →
            </button>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setStep("writing")}
        className="w-full text-zinc-600 hover:text-zinc-400 active:text-zinc-300 text-sm transition-colors py-2"
      >
        ← Voltar à escrita
      </button>
    </div>
  );
}
