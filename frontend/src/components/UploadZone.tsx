import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { analyzeDocument } from "../lib/api";

export function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const { referenceText, setReferenceText, setArchitecture, setStep, setLoading, setError, isLoading } =
    useProjectStore();

  const handleFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      setReferenceText(text);
    },
    [setReferenceText]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!referenceText.trim()) return;
    setLoading(true, "A analisar arquitectura do documento...");
    setError(null);
    try {
      const { architecture } = await analyzeDocument(referenceText);
      setArchitecture(architecture);
      setStep("objective");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setStep("objective");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">Documento de Referência</h2>
        <p className="text-zinc-400 text-sm">
          Cola ou carrega um documento para usar como referência arquitectural.
          A ferramenta extrai a sua lógica interna e aplica-a ao teu novo documento.
        </p>
      </div>

      {/* drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragging ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-500"}`}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <Upload className="mx-auto mb-2 text-zinc-500" size={32} />
        <p className="text-zinc-400 text-sm">Arrasta um ficheiro .txt ou .md, ou clica para seleccionar</p>
        <input
          id="file-input"
          type="file"
          accept=".txt,.md"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* ou cola */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">
          Ou cola o texto directamente
        </label>
        <textarea
          value={referenceText}
          onChange={(e) => setReferenceText(e.target.value)}
          placeholder="Cola aqui o documento de referência..."
          rows={10}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200
                     placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-y font-mono"
        />
        {referenceText && (
          <p className="text-xs text-zinc-500 text-right">
            {referenceText.length.toLocaleString()} caracteres · {referenceText.split(/\s+/).length.toLocaleString()} palavras
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={!referenceText.trim() || isLoading}
          className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <FileText size={16} />
          {isLoading ? "A analisar..." : "Analisar e Continuar"}
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500
                     rounded-lg text-sm transition-colors"
        >
          Sem referência
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-zinc-500 bg-zinc-900 rounded-lg p-3">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>
          Sem documento de referência, o FORGE usa um modelo arquitectural genérico de alta profundidade.
          Com referência, replica a lógica interna desse documento no teu novo objectivo.
        </span>
      </div>
    </div>
  );
}
