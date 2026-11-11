import { useState } from "react";
import { Zap, ChevronRight } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { buildBlueprint } from "../lib/api";

const EXAMPLES = [
  "Um sistema operacional para um assistente de IA dedicado a análise financeira",
  "Manual de identidade e cultura para uma startup de tecnologia",
  "Protocolo operacional para uma equipa de desenvolvimento de software",
  "Sistema de regras e identidade para um personagem de ficção científica",
  "Guia de estilo e voz editorial para uma publicação de tecnologia",
];

export function ObjectiveInput() {
  const { objective, setObjective, architecture, setSession, setLoading, setError, isLoading, setStep } =
    useProjectStore();
  const [localObjective, setLocalObjective] = useState(objective);

  const handleBuild = async () => {
    if (!localObjective.trim()) return;
    setObjective(localObjective);
    setLoading(true, "A construir arquitectura do documento...");
    setError(null);
    try {
      const { sessionId, blueprint } = await buildBlueprint(
        localObjective,
        architecture
      );
      setSession(sessionId, blueprint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">O que queres criar?</h2>
        <p className="text-zinc-400 text-sm">
          Descreve o documento que queres construir. Quanto mais específico fores,
          melhor a arquitectura gerada.
        </p>
      </div>

      {architecture && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-2">
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
          placeholder="Ex: Um sistema operacional para um assistente de IA especializado em análise de código, com identidade própria, regras de resposta, metodologia de debugging e protocolos de qualidade..."
          rows={5}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200
                     placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) handleBuild();
          }}
        />
        <p className="text-xs text-zinc-600">Ctrl+Enter para gerar</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Exemplos</p>
        <div className="space-y-1.5">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setLocalObjective(ex)}
              className="w-full text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800
                         border border-zinc-800 hover:border-zinc-600 rounded px-3 py-2 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep("upload")}
          className="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500
                     rounded-lg text-sm transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={handleBuild}
          disabled={!localObjective.trim() || isLoading}
          className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Zap size={16} />
          {isLoading ? "A construir arquitectura..." : "Gerar Arquitectura"}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
