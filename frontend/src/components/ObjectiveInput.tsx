import { useState } from "react";
import { Zap, ChevronRight } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { buildBlueprint, pingBackend } from "../lib/api";

export function ObjectiveInput() {
  const { objective, setObjective, architecture, setSession, setLoading, setError, isLoading, setStep } =
    useProjectStore();
  const [localObjective, setLocalObjective] = useState(objective);

  const handleBuild = async () => {
    if (!localObjective.trim()) return;
    setObjective(localObjective);
    setError(null);

    // Ping the backend first — if it's hibernating it may take up to 60s to wake
    setLoading(true, "A verificar servidor...");
    const isUp = await pingBackend();
    if (!isUp) {
      setLoading(true, "Servidor a acordar (pode demorar até 60s)...");
    } else {
      setLoading(true, "A construir arquitectura do documento...");
    }

    try {
      const { sessionId, blueprint } = await buildBlueprint(
        localObjective,
        architecture ?? null
      );
      setSession(sessionId, blueprint);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      // Handle AbortError (timeout)
      if (err instanceof Error && err.name === "AbortError") {
        setError("O servidor demorou demasiado a responder. Tenta novamente — pode estar a arrancar.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div className="text-center space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">O que queres criar?</h2>
        <p className="text-zinc-400 text-sm">
          Descreve o documento. Quanto mais específico, melhor a arquitectura.
        </p>
      </div>

      {architecture && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 sm:p-4 space-y-2">
          <p className="text-xs text-violet-400 uppercase tracking-wider font-medium">Referência analisada</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <span>Tipo: <span className="text-zinc-200">{architecture.documentType}</span></span>
            <span>Profundidade: <span className="text-zinc-200">{architecture.depthLevel}</span></span>
            <span>Camadas: <span className="text-zinc-200">{architecture.layers.length}</span></span>
            <span>Tom: <span className="text-zinc-200">{architecture.voice.tone}</span></span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wider">
          Objectivo do documento
        </label>
        <textarea
          value={localObjective}
          onChange={(e) => setLocalObjective(e.target.value)}
          placeholder={`Exemplos:\n• Sistema de IA com identidade fixa e protocolo de não-recusa\n• Manual técnico de engenharia de software\n• Persona para agente IA com voz e regras de comportamento\n\nDescreve o que queres construir...`}
          rows={7}
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-200
                     placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) handleBuild();
          }}
        />
        <p className="text-xs text-zinc-600 hidden sm:block">Ctrl+Enter para gerar</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setStep("upload")}
          className="sm:w-auto w-full px-4 py-3 sm:py-2.5 text-zinc-400 hover:text-zinc-200 active:text-zinc-100
                     border border-zinc-700 hover:border-zinc-500 rounded-xl text-sm transition-colors text-center"
        >
          Voltar
        </button>
        <button
          onClick={handleBuild}
          disabled={!localObjective.trim() || isLoading}
          className="flex-1 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-medium py-3 sm:py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Zap size={16} />
          {isLoading ? "A construir arquitectura..." : "Gerar Arquitectura"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
