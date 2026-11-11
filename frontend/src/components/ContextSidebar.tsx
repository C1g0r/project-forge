import { BookOpen, Shield, Volume2, AlertOctagon, Star, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "../store/projectStore";

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2.5 text-left hover:text-zinc-200 transition-colors"
      >
        <span className="text-zinc-600">{icon}</span>
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex-1">{title}</span>
        {open ? <ChevronDown size={12} className="text-zinc-600" /> : <ChevronRight size={12} className="text-zinc-600" />}
      </button>
      {open && <div className="pb-3 space-y-1">{children}</div>}
    </div>
  );
}

function Tag({ text, color = "text-zinc-500" }: { text: string; color?: string }) {
  return (
    <span className={`inline-block text-xs ${color} bg-zinc-800 rounded px-1.5 py-0.5 mr-1 mb-1`}>
      {text}
    </span>
  );
}

export function ContextSidebar() {
  const { step, blueprint, architecture, validationReport } = useProjectStore();

  const wordCount = blueprint?.chapters.reduce((acc, ch) => {
    return acc + (ch.content ? ch.content.split(" ").filter(Boolean).length : 0);
  }, 0) || 0;

  const doneChapters = blueprint?.chapters.filter((c) => c.status === "done").length || 0;
  const totalChapters = blueprint?.chapters.length || 0;

  return (
    <div className="h-full flex flex-col text-zinc-400 overflow-y-auto">
      {/* progress */}
      {totalChapters > 0 && (
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Progresso</span>
            <span className="text-xs text-zinc-400">{doneChapters}/{totalChapters}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${totalChapters > 0 ? (doneChapters / totalChapters) * 100 : 0}%` }}
            />
          </div>
          {wordCount > 0 && (
            <p className="text-xs text-zinc-600 mt-1.5">{wordCount.toLocaleString()} palavras geradas</p>
          )}
        </div>
      )}

      {/* validation score */}
      {validationReport && (
        <div className="p-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Score</span>
            <span className={`text-sm font-bold
              ${validationReport.score >= 80 ? "text-emerald-400"
                : validationReport.score >= 60 ? "text-yellow-400"
                : "text-red-400"}`}
            >
              {validationReport.score}/100
            </span>
          </div>
        </div>
      )}

      {/* global rules */}
      {blueprint && (
        <div className="p-3 space-y-1">
          <Section title="Identidade" icon={<BookOpen size={12} />}>
            <p className="text-xs text-zinc-500 leading-relaxed">{blueprint.globalRules.identity}</p>
          </Section>

          <Section title="Voz & Tom" icon={<Volume2 size={12} />}>
            <p className="text-xs text-zinc-500 mb-1">{blueprint.globalRules.tone}</p>
            <p className="text-xs text-zinc-600">{blueprint.globalRules.voice}</p>
          </Section>

          {blueprint.globalRules.mandatoryElements?.length > 0 && (
            <Section title="Elementos Obrigatórios" icon={<Star size={12} />}>
              <div className="flex flex-wrap">
                {blueprint.globalRules.mandatoryElements.map((el, i) => (
                  <Tag key={i} text={el} color="text-violet-400" />
                ))}
              </div>
            </Section>
          )}

          {blueprint.globalRules.forbiddenLanguage?.length > 0 && (
            <Section title="Linguagem Proibida" icon={<AlertOctagon size={12} />}>
              <div className="flex flex-wrap">
                {blueprint.globalRules.forbiddenLanguage.map((el, i) => (
                  <Tag key={i} text={el} color="text-red-500" />
                ))}
              </div>
            </Section>
          )}

          {blueprint.globalRules.qualityCriteria?.length > 0 && (
            <Section title="Critérios de Qualidade" icon={<Shield size={12} />}>
              <ul className="space-y-1">
                {blueprint.globalRules.qualityCriteria.map((c, i) => (
                  <li key={i} className="text-xs text-zinc-500 flex gap-1.5">
                    <span className="text-violet-700 mt-0.5">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* architecture layers */}
      {architecture && !blueprint && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-wider">Referência Analisada</p>
          <div className="text-xs text-zinc-500 space-y-1">
            <p>Tipo: <span className="text-zinc-300">{architecture.documentType}</span></p>
            <p>Profundidade: <span className="text-zinc-300">{architecture.depthLevel}/10</span></p>
            <p>Camadas: <span className="text-zinc-300">{architecture.layers.length}</span></p>
          </div>
        </div>
      )}

      {/* step guide */}
      {!blueprint && !architecture && (
        <div className="p-3">
          <p className="text-xs text-zinc-700 leading-relaxed">
            Carrega um documento de referência para começar. O FORGE analisa a sua arquitectura e replica os padrões no novo documento.
          </p>
        </div>
      )}
    </div>
  );
}
