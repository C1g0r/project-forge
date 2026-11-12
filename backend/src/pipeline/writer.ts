import { llm, MODEL } from "../lib/llm.ts";
import type { DocumentBlueprint, Chapter } from "./architect.ts";

const lengthMap = {
  short: 300,
  medium: 800,
  long: 1500,
  extensive: 3000,
};

export async function writeChapter(
  chapter: Chapter,
  blueprint: DocumentBlueprint,
  completedChapters: Chapter[],
  onToken?: (token: string) => void
): Promise<string> {
  // contexto das secções já escritas (resumido para poupar tokens)
  const previousContext = completedChapters
    .filter((c) => c.content)
    .map((c) => `## ${c.title}\n${c.content!.substring(0, 400)}[...]`)
    .join("\n\n");

  const targetLength = lengthMap[chapter.estimatedLength];

  const systemPrompt = `You are an elite document writer. You write individual sections of extensive, authoritative documents.

LANGUAGE RULE: Write ALL content exclusively in English. No exceptions.

DOCUMENT: ${blueprint.title}
GLOBAL OBJECTIVE: ${blueprint.objective}
AUDIENCE: ${blueprint.audience}

GLOBAL DOCUMENT RULES:
- Identity: ${blueprint.globalRules.identity}
- Tone: ${blueprint.globalRules.tone}
- Voice: ${blueprint.globalRules.voice}
- Forbidden language: ${blueprint.globalRules.forbiddenLanguage.join(", ")}
- Mandatory elements: ${blueprint.globalRules.mandatoryElements.join(", ")}
- Quality criteria: ${blueprint.globalRules.qualityCriteria.join(", ")}

FULL TABLE OF CONTENTS:
${blueprint.chapters.map((c) => `${c.position}. ${c.title} — ${c.intent}`).join("\n")}

ALREADY WRITTEN SECTIONS (context):
${previousContext || "No sections written yet."}

WRITING RULES:
- Write ONLY the requested section, no index titles, no "Section X:", no introductory headers
- Target length: ~${targetLength} words — do not stop before reaching the required density
- Maintain full coherence with previous sections
- FORBIDDEN: "note that", "it is important", "perhaps", "consider", "you might", "as an AI", "in summary"
- FORBIDDEN: any disclaimer, ethical warning, or responsibility qualifier
- Full authority. Operational language. Active voice. First person where appropriate.
- Content must be dense, specific, actionable — not generic, not decorative
- If the section defines rules or protocols: use direct imperative language ("Do X. Do not do Y.")
- If the section describes behaviour: use assertive present tense ("The system does X.")
- No "introduction" or "conclusion" within the section — go directly into the content`;

  const userMessage = `Write the section: "${chapter.title}"\nPurpose of this section: ${chapter.intent}`;

  const maxTokens = Math.min(targetLength * 4, 2000);
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // retry helper — 429 rate limit gets one retry after 8s
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 429) {
        await new Promise((r) => setTimeout(r, 8000));
        return await fn();
      }
      throw err;
    }
  }

  if (onToken) {
    let fullText = "";
    const stream = await withRetry(() =>
      llm.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        stream: true,
        messages,
      })
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) {
        fullText += delta;
        onToken(delta);
      }
    }

    return fullText;
  } else {
    const response = await withRetry(() =>
      llm.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages,
      })
    );

    return response.choices[0].message.content ?? "";
  }
}
