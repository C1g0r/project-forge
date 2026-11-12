import { useState } from "react";
import { Download, FileText, Copy, Check, ExternalLink } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { exportMarkdownUrl } from "../lib/api";

export function ExportPanel() {
  const { blueprint, sessionId, validationReport, setStep } = useProjectStore();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!blueprint || !sessionId) return null;

  const wordCount = blueprint.chapters.reduce((acc, ch) => {
    return acc + (ch.content ? ch.content.split(" ").filter(Boolean).length : 0);
  }, 0);

  const doneChapters = blueprint.chapters.filter((c) => c.status === "done");

  const buildMarkdownPreview = () => {
    const lines: string[] = [
      `# ${blueprint.title}`,
      "",
      `> **Objectivo:** ${blueprint.objective}`,
      `> **Audiência:** ${blueprint.audience}`,
      `> **Gerado em:** ${new Date().toLocaleDateString("pt-PT")}`,
      "",
      "---",
      "",
      "## Índice",
      "",
    ];

    doneChapters.forEach((ch) => {
      lines.push(`- [${ch.title}](#${ch.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")})`);
    });

    lines.push("", "---", "");

    doneChapters.forEach((ch) => {
      lines.push(`## ${ch.title}`, "", ch.content || "", "", "---", "");
    });

    return lines.join("\n");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const url = exportMarkdownUrl(sessionId);
      const res = await fetch(url);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${blueprint.title.replace(/\s+/g, "_")}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // fallback: download the preview
      const md = buildMarkdownPreview();
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${blueprint.title.replace(/\s+/g, "_")}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    const md = buildMarkdownPreview();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* doc summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-100 text-base sm:text-lg leading-tight">{blueprint.title}</h3>
            <p className="text-zinc-500 text-xs sm:text-sm mt-0.5 line-clamp-2">{blueprint.objective}</p>
          </div>
          {validationReport && (
            <div className={`text-sm font-bold px-2 py-1 rounded-lg shrink-0
              ${validationReport.score >= 80 ? "text-emerald-400 bg-emerald-500/10"
                : validationReport.score >= 60 ? "text-yellow-400 bg-yellow-500/10"
                : "text-red-400 bg-red-500/10"}`}
            >
              {validationReport.score}/100
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-lg font-bold text-zinc-100">{doneChapters.length}</p>
            <p className="text-xs text-zinc-600">capítulos</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-lg font-bold text-zinc-100">{wordCount.toLocaleString()}</p>
            <p className="text-xs text-zinc-600">palavras</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-lg font-bold text-zinc-100">{Math.round(wordCount / 250)}</p>
            <p className="text-xs text-zinc-600">min leitura</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <p className="text-lg font-bold text-zinc-100">{Math.round(wordCount / 300)}</p>
            <p className="text-xs text-zinc-600">páginas A4</p>
          </div>
        </div>
      </div>

      {/* export actions */}
      <div className="space-y-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Exportar como</p>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center gap-3 p-3 sm:p-4 bg-zinc-900 border border-zinc-700
                     hover:border-violet-500 active:border-violet-600 rounded-xl transition-colors group"
        >
          <div className="w-10 h-10 bg-zinc-800 group-hover:bg-violet-500/20 rounded-xl
                          flex items-center justify-center transition-colors shrink-0">
            <FileText size={20} className="text-zinc-400 group-hover:text-violet-400" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-zinc-200">Markdown (.md)</p>
            <p className="text-xs text-zinc-600">Com TOC, cabeçalhos e metadata</p>
          </div>
          <Download size={16} className={`text-zinc-600 group-hover:text-violet-400 transition-colors shrink-0 ${downloading ? "animate-bounce" : ""}`} />
        </button>

        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-3 p-3 sm:p-4 bg-zinc-900 border border-zinc-800
                     hover:border-zinc-600 active:border-zinc-500 rounded-xl transition-colors group"
        >
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0">
            {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} className="text-zinc-400 group-hover:text-zinc-200" />}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-zinc-200">Copiar para clipboard</p>
            <p className="text-xs text-zinc-600">Copia o texto completo em Markdown</p>
          </div>
          <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
            {copied ? "Copiado!" : "Copiar"}
          </span>
        </button>
      </div>

      {/* preview */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Pré-visualização</p>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 sm:p-4 max-h-48 sm:max-h-64 overflow-y-auto
                        font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
          {buildMarkdownPreview().substring(0, 1200)}
          {buildMarkdownPreview().length > 1200 && "\n\n..."}
        </div>
      </div>

      {/* navigation */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setStep("validate")}
          className="sm:w-auto w-full text-zinc-500 hover:text-zinc-300 active:text-zinc-200 border border-zinc-800 hover:border-zinc-600
                     rounded-xl px-4 py-3 sm:py-2 text-sm transition-colors"
        >
          ← Validação
        </button>
        <button
          onClick={() => setStep("writing")}
          className="sm:w-auto w-full text-zinc-500 hover:text-zinc-300 active:text-zinc-200 border border-zinc-800 hover:border-zinc-600
                     rounded-xl px-4 py-3 sm:py-2 text-sm transition-colors"
        >
          Editar capítulos
        </button>
      </div>
    </div>
  );
}
