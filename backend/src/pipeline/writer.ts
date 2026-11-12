import Anthropic from "@anthropic-ai/sdk";
import type { DocumentBlueprint, Chapter } from "./architect.ts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  if (onToken) {
    // streaming mode
    let fullText = "";
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(targetLength * 6, 4000),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Write the section: "${chapter.title}"\nPurpose of this section: ${chapter.intent}`,
        },
      ],
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        fullText += chunk.delta.text;
        onToken(chunk.delta.text);
      }
    }

    return fullText;
  } else {
    // non-streaming
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: Math.min(targetLength * 6, 4000),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Write the section: "${chapter.title}"\nPurpose of this section: ${chapter.intent}`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
