import { createWithFallback, MODEL } from "../lib/llm.ts";
import type { DocumentBlueprint, Chapter } from "./architect.ts";
import type { ValidationReport, Issue } from "./validator.ts";

export interface ImprovementResult {
  improvedCount: number;
  skippedCount: number;
  details: { chapterId: string; title: string; improved: boolean; reason?: string }[];
}

// Map issues to chapter titles mentioned in location strings
function extractChapterRefs(issues: Issue[]): Set<string> {
  const refs = new Set<string>();
  for (const issue of issues) {
    // location examples: "Chapter 3", "Section 2 vs 5", "Introduction", "Chapter: Engineering Workflow Engine"
    const loc = (issue.location ?? "").toLowerCase();
    refs.add(loc);
  }
  return refs;
}

function chapterIsAffected(chapter: Chapter, issues: Issue[]): Issue[] {
  const titleLower = chapter.title.toLowerCase();
  const posStr = String(chapter.position);

  return issues.filter((issue) => {
    const loc = (issue.location ?? "").toLowerCase();
    return (
      loc.includes(titleLower) ||
      loc.includes(`chapter ${posStr}`) ||
      loc.includes(`section ${posStr}`) ||
      loc.includes(`cap ${posStr}`) ||
      loc.includes(`cap. ${posStr}`)
    );
  });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e?.status === 429) {
      await new Promise((r) => setTimeout(r, 8000));
      return await fn();
    }
    throw err;
  }
}

export async function improveDocument(
  blueprint: DocumentBlueprint,
  chapters: Chapter[],
  report: ValidationReport,
  onProgress?: (chapterId: string, status: "start" | "done" | "skip") => void
): Promise<ImprovementResult> {
  const result: ImprovementResult = { improvedCount: 0, skippedCount: 0, details: [] };

  // Collect all issues for secondary context
  const allIssues: Issue[] = [
    ...report.contradictions,
    ...report.gaps,
    ...report.repetitions,
  ];

  // Suggestions are the PRIMARY driver — format them clearly
  const hasSuggestions = report.suggestions.length > 0;
  const suggestionsList = report.suggestions
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  for (const chapter of chapters) {
    if (!chapter.content || chapter.status !== "done") {
      result.skippedCount++;
      result.details.push({ chapterId: chapter.id, title: chapter.title, improved: false, reason: "not written" });
      continue;
    }

    const affectedIssues = chapterIsAffected(chapter, allIssues);

    // Só melhora capítulos com issues específicas OU sugestões relevantes ao conteúdo do capítulo
    // Evita reescrever capítulos bons com base em sugestões globais que não se aplicam
    const hasDirectIssues = affectedIssues.length > 0;
    const hasRelevantSuggestions = hasSuggestions && report.suggestions.some((s) => {
      const sLower = s.toLowerCase();
      const titleLower = chapter.title.toLowerCase();
      // Sugestão menciona explicitamente o capítulo, ou é uma sugestão de estrutura global
      return (
        sLower.includes(titleLower) ||
        sLower.includes("todo") || sLower.includes("todos") ||
        sLower.includes("document") || sLower.includes("documento") ||
        sLower.includes("all section") || sLower.includes("toda") ||
        sLower.includes("throughout") || sLower.includes("ao longo")
      );
    });

    if (!hasDirectIssues && !hasRelevantSuggestions) {
      result.skippedCount++;
      result.details.push({ chapterId: chapter.id, title: chapter.title, improved: false, reason: "no relevant issues" });
      onProgress?.(chapter.id, "skip");
      continue;
    }

    onProgress?.(chapter.id, "start");

    // Issues are secondary — only shown if present for this chapter
    const issueContext = affectedIssues.length > 0
      ? `\nADDITIONAL ISSUES DETECTED IN THIS CHAPTER (fix these too):\n${affectedIssues.map(
          (i) => `- [${i.severity.toUpperCase()}] ${i.description} → ${i.suggestion}`
        ).join("\n")}`
      : "";

    const prompt = `You are improving a chapter of an authoritative document based on a quality review.

DOCUMENT: ${blueprint.title}
OBJECTIVE: ${blueprint.objective}
AUDIENCE: ${blueprint.audience}

DOCUMENT RULES:
- Identity: ${blueprint.globalRules.identity}
- Tone: ${blueprint.globalRules.tone}
- Voice: ${blueprint.globalRules.voice}
- Forbidden: ${blueprint.globalRules.forbiddenLanguage.join(", ")}

━━━ PRIMARY TASK — APPLY THESE SUGGESTIONS ━━━
The validator reviewed the full document and produced these improvement suggestions.
Apply every suggestion that is relevant to this chapter:

${suggestionsList || "No suggestions — focus on fixing the issues below."}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${issueContext}

CURRENT CHAPTER CONTENT:
## ${chapter.title}
${chapter.content}

INSTRUCTIONS:
- Rewrite this chapter applying all relevant suggestions above
- If a suggestion doesn't apply to this chapter, skip it — do not force it
- Keep the same title and approximate length
- Do NOT invent new topics or change the chapter's purpose
- Output ONLY the rewritten chapter body — no title, no headers, no preamble`;

    try {
      // tokens necessários: aproximadamente o dobro do tamanho actual do capítulo
      // (reescrita pode expandir; cap em 6000 para não exaurir quota)
      const chapterTokenEstimate = Math.ceil((chapter.content.length / 4) * 1.5);
      const improveMaxTokens = Math.min(Math.max(chapterTokenEstimate, 1500), 6000);

      const response = await createWithFallback({
        model: MODEL,
        max_tokens: improveMaxTokens,
        messages: [
          { role: "system", content: "You are an elite document editor. Fix and improve the given chapter." },
          { role: "user", content: prompt },
        ],
      });

      const improved = response.choices[0].message.content ?? "";
      if (improved.trim().length > 100) {
        chapter.content = improved.trim();
        result.improvedCount++;
        result.details.push({ chapterId: chapter.id, title: chapter.title, improved: true });
        onProgress?.(chapter.id, "done");
      } else {
        result.skippedCount++;
        result.details.push({ chapterId: chapter.id, title: chapter.title, improved: false, reason: "empty response" });
        onProgress?.(chapter.id, "skip");
      }
    } catch (err) {
      result.skippedCount++;
      result.details.push({
        chapterId: chapter.id,
        title: chapter.title,
        improved: false,
        reason: err instanceof Error ? err.message : "error",
      });
      onProgress?.(chapter.id, "skip");
    }
  }

  return result;
}
