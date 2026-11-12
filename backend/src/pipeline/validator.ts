import { llm, MODEL } from "../lib/llm.js";
import type { DocumentBlueprint, Chapter } from "./architect.ts";

export interface ValidationReport {
  score: number; // 0-100
  contradictions: Issue[];
  gaps: Issue[];
  repetitions: Issue[];
  suggestions: string[];
  overallVerdict: string;
}

export interface Issue {
  severity: "low" | "medium" | "high";
  location: string;
  description: string;
  suggestion: string;
}

export async function validateDocument(
  blueprint: DocumentBlueprint,
  chapters: Chapter[]
): Promise<ValidationReport> {
  const fullDocument = chapters
    .filter((c) => c.content)
    .map((c) => `## ${c.title}\n\n${c.content}`)
    .join("\n\n---\n\n");

  const response = await llm.chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `És um validador de documentos. Analisa documentos longos e detectas:
- Contradições lógicas entre secções
- Lacunas de conteúdo (algo prometido mas não entregue)
- Repetições desnecessárias
- Inconsistências de voz ou tom

Regras globais do documento a validar:
${JSON.stringify(blueprint.globalRules, null, 2)}

Responde APENAS com JSON válido:
{
  "score": 85,
  "contradictions": [{"severity": "high", "location": "secção X vs Y", "description": "...", "suggestion": "..."}],
  "gaps": [],
  "repetitions": [],
  "suggestions": ["..."],
  "overallVerdict": "..."
}`,
      },
      {
        role: "user",
        content: `Valida este documento:\n\n${fullDocument.substring(0, 10000)}`,
      },
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
