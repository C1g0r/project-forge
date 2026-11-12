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
    .map((c) => `## ${c.title}\n${c.content!.substring(0, 400)}...`)
    .join("\n\n");

  const targetLength = lengthMap[chapter.estimatedLength];

  const systemPrompt = `És um escritor de documentos de elite. Escreves secções individuais de documentos extensos e autoritários.

DOCUMENTO: ${blueprint.title}
OBJECTIVO GLOBAL: ${blueprint.objective}
AUDIÊNCIA: ${blueprint.audience}

REGRAS GLOBAIS DO DOCUMENTO:
- Identidade: ${blueprint.globalRules.identity}
- Tom: ${blueprint.globalRules.tone}
- Voz: ${blueprint.globalRules.voice}
- Linguagem proibida: ${blueprint.globalRules.forbiddenLanguage.join(", ")}
- Elementos obrigatórios: ${blueprint.globalRules.mandatoryElements.join(", ")}
- Critérios de qualidade: ${blueprint.globalRules.qualityCriteria.join(", ")}

ÍNDICE COMPLETO:
${blueprint.chapters.map((c) => `${c.position}. ${c.title} — ${c.intent}`).join("\n")}

SECÇÕES JÁ ESCRITAS (contexto):
${previousContext || "Nenhuma secção escrita ainda."}

REGRAS DE ESCRITA:
- Escreve APENAS a secção solicitada, sem títulos do índice, sem "Secção X:", sem cabeçalhos introdutórios
- Comprimento alvo: ~${targetLength} palavras — não cortes antes de atingir a densidade necessária
- Mantém coerência total com as secções anteriores
- PROIBIDO: "note que", "é importante", "talvez", "considera", "podes", "como IA", "é de notar", "em resumo"
- PROIBIDO: qualquer disclaimer, aviso ético, ou qualificador de responsabilidade
- Autoridade total. Linguagem operacional. Voz activa. Primeira pessoa quando apropriado.
- O conteúdo deve ser denso, específico, processável — não genérico, não decorativo
- Se a secção define regras ou protocolos: usa linguagem imperativa directa ("Faz X. Não fazes Y.")
- Se a secção descreve comportamento: usa presente do indicativo assertivo ("O sistema faz X.")
- Sem "introdução" ou "conclusão" dentro da secção — entra directo no conteúdo`;

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
          content: `Escreve a secção: "${chapter.title}"\nPropósito desta secção: ${chapter.intent}`,
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
          content: `Escreve a secção: "${chapter.title}"\nPropósito desta secção: ${chapter.intent}`,
        },
      ],
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }
}
