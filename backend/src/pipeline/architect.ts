import Anthropic from "@anthropic-ai/sdk";
import type { DocumentArchitecture } from "./analyzer.ts";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DocumentBlueprint {
  title: string;
  objective: string;
  audience: string;
  chapters: Chapter[];
  globalRules: GlobalRules;
}

export interface Chapter {
  id: string;
  title: string;
  intent: string;
  position: number;
  dependsOn: string[];
  estimatedLength: "short" | "medium" | "long" | "extensive";
  status: "pending" | "generating" | "done";
  content?: string;
}

export interface GlobalRules {
  identity: string;
  tone: string;
  voice: string;
  forbiddenLanguage: string[];
  mandatoryElements: string[];
  qualityCriteria: string[];
}

export async function buildBlueprint(
  objective: string,
  referenceArchitecture: DocumentArchitecture | null
): Promise<DocumentBlueprint> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `És um arquitecto de documentos. Recebes um objectivo e uma arquitectura de referência. Crias um plano estrutural completo para um novo documento que tem a mesma profundidade e lógica interna da referência, mas dedicado ao novo objectivo.

ARQUITECTURA DE REFERÊNCIA:
${JSON.stringify(referenceArchitecture, null, 2)}

REGRAS:
- O novo documento deve ter a mesma densidade estrutural da referência
- Cada capítulo deve ter um propósito claro e dependências explícitas
- As regras globais devem ser específicas, não genéricas
- O índice deve ser lógico: cada secção suporta a seguinte

Responde APENAS com JSON válido. Formato exacto:
{
  "title": "...",
  "objective": "...",
  "audience": "...",
  "chapters": [
    {
      "id": "ch1",
      "title": "...",
      "intent": "O que esta secção faz e porquê está aqui",
      "position": 1,
      "dependsOn": [],
      "estimatedLength": "long",
      "status": "pending"
    }
  ],
  "globalRules": {
    "identity": "...",
    "tone": "...",
    "voice": "...",
    "forbiddenLanguage": [],
    "mandatoryElements": [],
    "qualityCriteria": []
  }
}`,
    messages: [
      {
        role: "user",
        content: `Objectivo do novo documento: ${objective}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  // strip markdown fences: ```json ... ``` ou ``` ... ```
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // fallback: extrair o bloco JSON mais externo caso haja texto extra
  if (!text.startsWith("{")) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) text = match[0];
  }

  // se o JSON foi truncado, tentar recuperar fechando estruturas abertas
  const tryParse = (src: string): DocumentBlueprint | null => {
    try {
      return JSON.parse(src) as DocumentBlueprint;
    } catch {
      return null;
    }
  };

  let blueprint = tryParse(text);

  if (!blueprint) {
    // tentativa de reparação: fechar arrays/objectos abertos
    let repaired = text;
    const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    // remover vírgula pendente antes de fechar
    repaired = repaired.replace(/,\s*$/, "");
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    blueprint = tryParse(repaired);
  }

  if (!blueprint) {
    throw new Error(`Architect falhou a parsear JSON: ${text.substring(0, 300)}`);
  }

  // garantir que todos os chapters têm status pending
  blueprint.chapters = (blueprint.chapters ?? []).map((ch) => ({
    ...ch,
    status: "pending" as const,
  }));
  return blueprint;
}
