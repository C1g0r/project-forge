import { llm, MODEL } from "../lib/llm.ts";
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

  // Collect all issues
  const allIssues: Issue[] = [
    ...report.contradictions,
    ...report.gaps,
    ...report.repetitions,
  ];

  // Build suggestion context (always applied to all rewrites)
  const globalSuggestions = report.suggestions.join("\n- ");

  for (const chapter of chapters) {
    if (!chapter.content || chapter.status !== "done") {
      result.skippedCount++;
      result.details.push({ chapterId: chapter.id, title: chapter.title, improved: false, reason: "not written" });
      continue;
    }

    const affectedIssues = chapterIsAffected(chapter, allIssues);
    const hasGlobalSuggestions = report.suggestions.length > 0;

    // Skip chapters with no specific issues AND no global suggestions
    if (affectedIssues.length === 0 && !hasGlobalSuggestions) {
      result.skippedCount++;
      result.details.push({ chapterId: chapter.id, title: chapter.title, improved: false, reason: "no issues found" });
      onProgress?.(chapter.id, "skip");
      continue;
    }

    onProgress?.(chapter.id, "start");

    const issueContext = affectedIssues.length > 0
      ? `\nSPECIFIC ISSUES IN THIS CHAPTER:\n${affectedIssues.map(
          (i) => `- [${i.severity.toUpperCase()}] ${i.description}\n  FIX: ${i.suggestion}`
        ).join("\n")}`
      : "";

    const prompt = `You are rewriting a chapter of an authoritative document to fix quality issues.

DOCUMENT: ${blueprint.title}
OBJECTIVE: ${blueprint.objective}
AUDIENCE: ${blueprint.audience}

GLOBAL RULES:
- Identity: ${blueprint.globalRules.identity}
- Tone: ${blueprint.globalRules.tone}
- Voice: ${blueprint.globalRules.voice}
- Forbidden: ${blueprint.globalRules.forbiddenLanguage.join(", ")}

GLOBAL IMPROVEMENT SUGGESTIONS TO APPLY:
- ${globalSuggestions || "None"}
${issueContext}

CURRENT CHAPTER CONTENT:
## ${chapter.title}
${chapter.content}

INSTRUCTIONS:
- Rewrite this chapter fixing ALL issues listed above
- Keep the same title and approximate length
- Do NOT change topics or invent new content not implied by the original
- Remove repetitions, resolve contradictions, fill gaps where content is clearly implied
- Maintain full coherence with the document's tone and voice
- Output ONLY the rewritten chapter body — no title, no headers, no preamble`;

    try {
      const response = await withRetry(() =>
        llm.chat.completions.create({
          model: MODEL,
          max_tokens: 2000,
          messages: [
            { role: "system", content: "You are an elite document editor. Fix and improve the given chapter." },
            { role: "user", content: prompt },
          ],
        })
      );

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
