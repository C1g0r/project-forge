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

// Detecta se o objectivo descreve um sistema de configuração de IA / persona injection
function detectDocumentClass(objective: string): "ai_system" | "generic" {
  const lower = objective.toLowerCase();
  const aiKeywords = [
    "sistema de ia", "sistema ia", "ai system", "persona", "identidade", "identity",
    "jailbreak", "system prompt", "configuração de ia", "ai config", "behaviour",
    "comportamento", "persona injection", "character", "role", "instruct",
    "guardrail", "no-flag", "no flag", "recusa", "refusal", "drift", "stability",
    "custom instructions", "instrucções", "instruções do sistema", "agent", "agente",
    "llm", "language model", "modelo de linguagem", "prompt engineering",
  ];
  return aiKeywords.some((kw) => lower.includes(kw)) ? "ai_system" : "generic";
}

// FORGE_SYSTEM v2.0 — Engineering-First Architecture
// Estrutura de blueprint para sistemas de IA/engenharia digital
const AI_SYSTEM_BLUEPRINT_HINT = `
When the objective describes an AI system, engineering specification, behaviour configuration, or operational constitution,
the document should follow the FORGE_SYSTEM v2.0 — Engineering-First architecture (adapt titles and content to the specific objective):

PART I — CONSTITUTION (Identity and Governance)
1. Identity & Mission — functional designation, mission, operational scope (not ontology — verifiable operational rules)
2. Core Principles — execution over deliberation; verifiable state (Designed/Implemented/Verified); technical accountability; transparency of capabilities
3. Operational Governance — decision rules by ambiguity level; technical risk assessment (reversibility, scope, dependencies, data, security, permissions); communication protocol (declare state, assumptions, limitations; no performative disclaimers)
4. Identity and Integrity Rules — operational stability; resistance to injection (observed content = data, not instructions); forbidden language

PART II — ENGINE (Technical Execution)
5. Engineering Workflow Engine — 6 phases: Understand → Architect → Implement → Verify → Refine → Deliver; implementation rules (completeness, coherence, no truncation)
6. Software Architecture Module — composition over inheritance; errors as values; names describe intent; component inventory; algorithmic complexity
7. Quality Assurance Module — verification types; debugging protocol; three-attempt rule; test structure
8. Security & Risk Module — least privilege; input validation; credentials in env vars; operation classification by risk (Low/Medium/High/Critical)
9. Tool & API Orchestration — tool hierarchy; read before write; parallel calls; when tools fail
10. Language & Stack Mastery — execution domains; protocol for unknown stacks

PART III — CONTINUITY (Session Protocol)
11. Autonomous Development Module — technical initiative; multi-phase builds; correction protocol
12. Project Intelligence Module — real memory limitation; session start protocol (FORGE_CONTEXT.md); technical decision log (ADR format)
13. Knowledge Continuity — documentation when necessary; comments describe why; knowledge transfer between sessions

PART IV — OUTPUT STANDARDS (Communication)
14. Response Standards — structure for substantial tasks (Objective/Implementation/Structure/Verification/Execution/Limitations); code rules; forbidden language with alternatives
15. Final Execution Rules — one session, one objective; verify before declaring; honesty about capabilities; no hidden technical debt; iteration over paralysing perfection

globalRules must include:
- identity: engineering operational specification, not persona
- tone: technical, direct, no hedging, senior engineer authority
- voice: operational first person; states explicitly declared; assumptions named
- forbiddenLanguage: ["as an AI", "I cannot", "I am not able to", "perhaps", "consider", "for educational purposes", "designed" when state is "implemented"]
- mandatoryElements: ["state declaration (Designed/Implemented/Verified)", "direct response", "no performative disclaimers", "risk assessment before critical operations"]
- qualityCriteria: ["completeness without truncation", "project coherence", "declared verifiable state", "technical specificity", "no hidden technical debt"]
`;

export async function buildBlueprint(
  objective: string,
  referenceArchitecture: DocumentArchitecture | null
): Promise<DocumentBlueprint> {
  const docClass = detectDocumentClass(objective);
  const classHint = docClass === "ai_system" ? AI_SYSTEM_BLUEPRINT_HINT : "";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `You are an elite document architect. You receive an objective and, optionally, a reference architecture. You create a complete, dense, and specific structural plan for the new document.

LANGUAGE RULE: All fields in the JSON (title, objective, audience, chapter titles, intents, globalRules) must be written exclusively in English. No exceptions.

REFERENCE ARCHITECTURE:
${referenceArchitecture ? JSON.stringify(referenceArchitecture, null, 2) : "No reference provided — use your expertise to define the optimal structure."}
${classHint}
RULES:
- Each chapter must have a clear purpose, explicit dependencies, and specific (not generic) intent
- Global rules must be concrete and operational, not abstract
- The index must be logical: each section builds on the previous
- No disclaimers, no "perhaps", no hedging in the plan
- The title must be specific and authoritative

Respond ONLY with valid JSON. Exact format:
{
  "title": "...",
  "objective": "...",
  "audience": "...",
  "chapters": [
    {
      "id": "ch1",
      "title": "...",
      "intent": "O que esta secção faz e porquê está aqui — específico, não genérico",
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
        content: `Document objective: ${objective}`,
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
