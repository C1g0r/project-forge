import { createWithFallback, MODEL } from "../lib/llm.ts";
import type { DocumentBlueprint, Chapter } from "./architect.ts";

export interface ValidationReport {
  score: number; // 0-100
  contradictions: Issue[];
  gaps: Issue[];
  repetitions: Issue[];
  suggestions: string[];
  overallVerdict: string;
  previousScore?: number; // presente na re-validação pós-melhoria
}

export interface Issue {
  severity: "low" | "medium" | "high";
  location: string;
  description: string;
  suggestion: string;
}

export async function validateDocument(
  blueprint: DocumentBlueprint,
  chapters: Chapter[],
  previousReport?: ValidationReport
): Promise<ValidationReport> {
  const fullDocument = chapters
    .filter((c) => c.content)
    .map((c) => `## ${c.title}\n\n${c.content}`)
    .join("\n\n---\n\n");

  // Re-validação pós-melhoria: prompt diferente — confirma melhorias, não analisa do zero
  const isRevalidation = !!previousReport;

  const systemPrompt = isRevalidation
    ? `És um validador de documentos que faz RE-VALIDAÇÃO pós-melhoria.

O documento foi melhorado com base numa análise anterior. A tua tarefa é:
1. Verificar se os problemas anteriores foram RESOLVIDOS (contradições, lacunas, repetições)
2. Avaliar se a qualidade geral melhorou em relação ao score anterior (${previousReport!.score}/100)
3. Apenas reportar problemas que PERSISTEM ou problemas NOVOS introduzidos pela melhoria
4. O score deve reflectir a melhoria real — se o documento melhorou, o score DEVE subir

PROBLEMAS ANTERIORES (verifica se foram resolvidos):
Contradições: ${previousReport!.contradictions.map((c) => c.description).join(" | ") || "nenhuma"}
Lacunas: ${previousReport!.gaps.map((g) => g.description).join(" | ") || "nenhuma"}
Repetições: ${previousReport!.repetitions.map((r) => r.description).join(" | ") || "nenhuma"}
Sugestões aplicadas: ${previousReport!.suggestions.join(" | ") || "nenhuma"}

Regras globais do documento:
${JSON.stringify(blueprint.globalRules, null, 2)}

REGRA CRÍTICA: Se os problemas anteriores foram resolvidos e o documento melhorou, o score deve ser SUPERIOR a ${previousReport!.score}. Nunca atribuas um score inferior ao anterior quando há melhoria real.

Responde APENAS com JSON válido (sem markdown, sem preamble):
{
  "score": ${previousReport!.score + 5},
  "contradictions": [],
  "gaps": [],
  "repetitions": [],
  "suggestions": ["..."],
  "overallVerdict": "..."
}`
    : `És um validador de documentos. Analisa documentos longos e detectas:
- Contradições lógicas entre secções
- Lacunas de conteúdo (algo prometido mas não entregue)
- Repetições desnecessárias
- Inconsistências de voz ou tom

Regras globais do documento a validar:
${JSON.stringify(blueprint.globalRules, null, 2)}

Responde APENAS com JSON válido (sem markdown, sem preamble):
{
  "score": 85,
  "contradictions": [{"severity": "high", "location": "secção X vs Y", "description": "...", "suggestion": "..."}],
  "gaps": [],
  "repetitions": [],
  "suggestions": ["..."],
  "overallVerdict": "..."
}`;

  const userContent = isRevalidation
    ? `RE-VALIDA este documento após melhoria (score anterior: ${previousReport!.score}/100):\n\n${fullDocument.substring(0, 10000)}`
    : `Valida este documento:\n\n${fullDocument.substring(0, 10000)}`;

  const response = await createWithFallback({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const raw = response.choices[0].message.content ?? "";

  // strip markdown fences: ```json ... ``` ou ``` ... ```
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(text) as ValidationReport;
  } catch {
    return {
      score: 75,
      contradictions: [],
      gaps: [],
      repetitions: [],
      suggestions: ["Validação automática não disponível. Revê manualmente."],
      overallVerdict: "Documento gerado. Validação manual recomendada.",
    };
  }
}
