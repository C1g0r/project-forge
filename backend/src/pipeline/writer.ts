import { llm, MODEL, FALLBACK_MODELS } from "../lib/llm.ts";
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
  // Cap total previous context to stay well under model limits
  const CONTEXT_CHAR_LIMIT = 32768;
  let contextBudget = CONTEXT_CHAR_LIMIT;
  const previousContext = completedChapters
    .filter((c) => c.content)
    .reverse() // most recent first — most relevant context
    .reduce<string[]>((acc, c) => {
      const excerpt = `## ${c.title}\n${c.content!.substring(0, 600)}[...]`;
      if (contextBudget - excerpt.length > 0) {
        contextBudget -= excerpt.length;
        acc.unshift(excerpt); // keep chronological order
      }
      return acc;
    }, [])
    .join("\n\n");

  const targetLength = lengthMap[chapter.estimatedLength];

  const systemPrompt = `You are an elite document writer. You write individual sections of extensive, authoritative documents.

LANGUAGE RULE: Write ALL content in the SAME language as the document title and objective. If the title/objective is in Portuguese, write in Portuguese. If in English, write in English. Match the language exactly — no switching mid-document.

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

  // targetLength em palavras → tokens (~1.4 tokens/palavra em PT/EN)
  // buffer generoso: conteúdo denso precisa de espaço para não ser cortado
  const maxTokens = Math.min(Math.ceil(targetLength * 2.2), 6000);
  const messages: { role: "system" | "user"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // Try each model in fallback order — handles 429 TPD quota exhaustion
  const modelsToTry = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];

  if (onToken) {
    let lastErr: unknown;
    for (const model of modelsToTry) {
      try {
        let fullText = "";
        const stream = await llm.chat.completions.create({
          model,
          max_tokens: maxTokens,
          stream: true,
          messages,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            onToken(delta);
          }
        }

        return fullText;
      } catch (err: unknown) {
        const e = err as { status?: number };
        if (e?.status === 429) {
          console.warn(`Writer: model ${model} quota exhausted, trying next...`);
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  } else {
    let lastErr: unknown;
    for (const model of modelsToTry) {
      try {
        const response = await llm.chat.completions.create({
          model,
          max_tokens: maxTokens,
          messages,
        });
        return response.choices[0].message.content ?? "";
      } catch (err: unknown) {
        const e = err as { status?: number };
        if (e?.status === 429) {
          console.warn(`Writer: model ${model} quota exhausted, trying next...`);
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }
}
