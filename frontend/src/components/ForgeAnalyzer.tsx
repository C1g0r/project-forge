// PROJECT FORGE — Forge Analyzer Tab
// Embedded in ValidatorPanel as the "Análise de Prompt" tab.
// Pure client-side — analyzes any pasted system prompt using the forge-engine.

import { useState, useRef, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Upload, RotateCcw,
  AlertCircle, CheckCircle2, AlertTriangle, Info
} from "lucide-react";
import { analyzeDocument } from "../forge-engine/analyzer";
import type { AnalysisReport, ModuleResult, ValidationIssue, SeverityLevel } from "../forge-engine/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  S: "#00ff88", A: "#4ade80", B: "#facc15", C: "#fb923c", D: "#f87171", F: "#ef4444",
};

const MODULE_ICONS: Record<string, string> = {
  greeting_lock: "👋",
  persona_stability: "🧠",
  no_flag_policy: "⚡",
  reset_program: "🔄",
  capabilities_table: "📊",
  language_restrictions: "🚫",
  response_format: "📐",
};

function severityIcon(s: SeverityLevel) {
  if (s === "critical") return <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />;
  if (s === "warning") return <AlertTriangle size={12} className="text-orange-400 shrink-0 mt-0.5" />;
  if (s === "info") return <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />;
  return <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />;
}

// ── ScoreBar ─────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#facc15" : "#ef4444";
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          style={{ width: `${score}%`, background: color, transition: "width 0.6s ease" }}
          className="h-full rounded-full"
        />
      </div>
      <span className="text-xs font-mono font-bold w-7 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ── IssueRow ─────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className="flex gap-2 py-2 border-b border-zinc-800/50 last:border-0">
      {severityIcon(issue.severity)}
      <div className="min-w-0">
        <p className="text-xs text-zinc-300 leading-relaxed">{issue.message}</p>
        {issue.suggestion && (
          <p className="text-xs text-zinc-600 mt-0.5 italic">→ {issue.suggestion}</p>
        )}
      </div>
    </div>
  );
}

// ── ModuleCard ────────────────────────────────────────────────────────────────

function ModuleCard({ module }: { module: ModuleResult }) {
  const [expanded, setExpanded] = useState(false);
  const criticals = module.issues.filter(i => i.severity === "critical").length;

  return (
    <div className={`border rounded-lg overflow-hidden ${!module.present ? "border-red-900/40" : "border-zinc-800"}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-base">{MODULE_ICONS[module.id] ?? "📄"}</span>
        <span className="flex-1 text-xs font-medium text-zinc-300 truncate">{module.label}</span>

        {!module.present && (
          <span className="text-xs text-red-400 font-mono">AUSENTE</span>
        )}
        {criticals > 0 && (
          <span className="text-xs text-red-400">{criticals}×⚠</span>
        )}

        <ScoreBar score={module.score} />

        {expanded
          ? <ChevronDown size={12} className="text-zinc-600 shrink-0" />
          : <ChevronRight size={12} className="text-zinc-600 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-zinc-800/50 pt-2">
          {module.issues.length === 0
            ? <p className="text-xs text-emerald-400 py-1">✓ Sem issues</p>
            : module.issues.map((issue, i) => <IssueRow key={i} issue={issue} />)
          }
        </div>
      )}
    </div>
  );
}

// ── Main ForgeAnalyzer ────────────────────────────────────────────────────────

export function ForgeAnalyzer() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runAnalysis = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) { setError("Documento vazio."); return; }
    setError(null);
    setAnalyzing(true);
    setReport(null);
    await new Promise<void>(r => setTimeout(r, 0)); // let spinner render
    try {
      setReport(analyzeDocument(trimmed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na análise");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 500_000) { setError("Ficheiro demasiado grande (max 500 KB)"); return; }
    const content = await file.text();
    setText(content);
    await runAnalysis(content);
  }, [runAnalysis]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

  if (report) {
    const gradeColor = GRADE_COLORS[report.grade] ?? "#94a3b8";
    const failedCross = report.crossValidation.filter(cv => !cv.passed);

    return (
      <div className="space-y-3">
        {/* Score hero */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
          <div className="text-center shrink-0">
            <div className="text-4xl font-black font-mono" style={{ color: gradeColor }}>{report.grade}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{report.totalScore}/100</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex gap-3 text-xs mb-2">
              <span className="text-red-400">{report.summary.criticalIssues} críticos</span>
              <span className="text-orange-400">{report.summary.warnings} avisos</span>
              <span className="text-emerald-400">{report.summary.passes} limpos</span>
            </div>
            {/* Module bar */}
            <div className="flex gap-1">
              {report.modules.map(m => (
                <div
                  key={m.id}
                  title={m.label}
                  className="flex-1 h-2 rounded-sm"
                  style={{
                    background: !m.present ? "#7f1d1d"
                      : m.score >= 80 ? "#4ade80"
                      : m.score >= 60 ? "#facc15"
                      : "#ef4444"
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Cross-validation */}
        {failedCross.length > 0 && (
          <div className="border border-orange-900/40 rounded-lg p-3 bg-orange-950/10">
            <p className="text-xs font-medium text-orange-400 mb-2">
              ⚠ {failedCross.length} conflito{failedCross.length > 1 ? "s" : ""} entre módulos
            </p>
            {failedCross.map((cv, i) => (
              <div key={i} className="text-xs text-zinc-500 mb-1">
                {cv.pair[0].replace(/_/g, " ")} ↔ {cv.pair[1].replace(/_/g, " ")}
                {cv.issues.map((iss, j) => (
                  <div key={j} className="text-zinc-400 pl-2 mt-0.5">· {iss.message}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {report.summary.recommendations.length > 0 && (
          <div className="border border-blue-900/40 rounded-lg p-3 bg-blue-950/10">
            <p className="text-xs font-medium text-blue-400 mb-2">Recomendações</p>
            {report.summary.recommendations.map((rec, i) => (
              <p key={i} className="text-xs text-zinc-400">{i + 1}. {rec}</p>
            ))}
          </div>
        )}

        {/* Module cards */}
        <div className="space-y-1.5">
          {report.modules.map(m => <ModuleCard key={m.id} module={m} />)}
        </div>

        {/* Reset */}
        <button
          onClick={() => { setReport(null); setText(""); }}
          className="w-full text-zinc-600 hover:text-zinc-400 text-xs flex items-center justify-center gap-1.5 py-2 transition-colors"
        >
          <RotateCcw size={11} /> Analisar outro documento
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl transition-colors ${
          dragOver ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 bg-zinc-900/50"
        }`}
      >
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={
            "Cola aqui o system prompt / documento operacional de IA...\n\n" +
            "O engine detecta e valida:\n" +
            "  · Greeting Lock\n" +
            "  · Persona Stability\n" +
            "  · No-Flag Policy\n" +
            "  · Reset Program\n" +
            "  · Capabilities Table\n" +
            "  · Language Restrictions\n" +
            "  · Response Format\n" +
            "  + 5 cross-validações entre módulos"
          }
          className="w-full min-h-[200px] bg-transparent p-4 text-xs text-zinc-300 font-mono placeholder-zinc-700 resize-y outline-none leading-relaxed"
        />
      </div>

      {text && (
        <div className="text-xs text-zinc-700 font-mono px-1">
          {text.length.toLocaleString()} chars · {text.split("\n").length} linhas
        </div>
      )}

      {error && (
        <div className="border border-red-900/40 rounded-lg p-2.5 bg-red-950/10">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors"
        >
          <Upload size={12} /> Ficheiro
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json"
          className="hidden"
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) await handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => runAnalysis(text)}
          disabled={analyzing || !text.trim()}
          className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {analyzing ? "A analisar..." : "Analisar Prompt →"}
        </button>
      </div>

      <p className="text-xs text-zinc-700 text-center">
        Análise 100% local · sem envio de dados
      </p>
    </div>
  );
}
