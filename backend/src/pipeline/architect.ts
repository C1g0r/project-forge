import { createWithFallback, MODEL } from "../lib/llm.ts";
import type { DocumentArchitecture } from "./analyzer.ts";

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

  const response = await createWithFallback({
    model: MODEL,
    max_tokens: 4000,
    temperature: 0.3,
    // response_format json_object removed — not supported by all Groq models
    messages: [
      {
        role: "system",
        content: `You are an elite document architect. You receive an objective and, optionally, a reference architecture. You create a complete, dense, and specific structural plan for the new document.

LANGUAGE RULE: Detect the language of the user's objective and write ALL fields in the JSON (title, objective, audience, chapter titles, intents, globalRules) in that same language. If the objective is in Portuguese, write everything in Portuguese. If in English, write in English. Match the user's language exactly.

REFERENCE ARCHITECTURE:
${referenceArchitecture ? JSON.stringify(referenceArchitecture, null, 2) : "No reference provided — use your expertise to define the optimal structure."}
${classHint}
RULES:
- Each chapter must have a clear purpose, explicit dependencies, and specific (not generic) intent
- Global rules must be concrete and operational, not abstract
- The index must be logical: each section builds on the previous
- No disclaimers, no "perhaps", no hedging in the plan
- The title must be specific and authoritative

OUTPUT RULE: Output ONLY the raw JSON object. No preamble. No explanation. No markdown. No <think> blocks. No XML tags. Start your response with { and end with }. Nothing before {. Nothing after }.

Exact JSON format:
{
  "title": "...",
  "objective": "...",
  "audience": "...",
  "chapters": [
    {
      "id": "ch1",
      "title": "...",
      "intent": "What this section does and why it is here — specific, not generic",
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
      },
      {
        role: "user",
        content: `Document objective: ${objective}`,
      },
    ],
  });

  const raw = response.choices[0].message.content ?? "";

  // 1. strip <think>...</think> blocks (Qwen/DeepSeek thinking models)
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. strip markdown fences: ```json ... ``` ou ``` ... ```
  text = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // 3. strip XML-like wrappers: <json>...</json>, 【json】...【/json】, <output>...</output>
  text = text
    .replace(/^<json>\s*/i, "")
    .replace(/\s*<\/json>\s*$/i, "")
    .replace(/^【json】\s*/i, "")
    .replace(/\s*【\/json】\s*$/i, "")
    .replace(/^<output>\s*/i, "")
    .replace(/\s*<\/output>\s*$/i, "")
    .trim();

  // 4. extrair desde o primeiro { até ao último } (handle texto extra antes/depois,
  //    incluindo thinking inline sem tags — Qwen/DeepSeek sem enable_thinking)
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  const tryParse = (src: string): DocumentBlueprint | null => {
    try {
      return JSON.parse(src) as DocumentBlueprint;
    } catch {
      return null;
    }
  };

  let blueprint = tryParse(text);

  if (!blueprint) {
    // tentativa de reparação: fechar arrays/objectos abertos (output truncado)
    let repaired = text;
    repaired = repaired.replace(/,\s*$/, "");
    repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*"[^"]*$/, "");
    repaired = repaired.replace(/,?\s*"[^"]*"\s*:\s*$/, "");
    const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets; i++) repaired += "]";
    for (let i = 0; i < openBraces; i++) repaired += "}";
    blueprint = tryParse(repaired);
  }

  if (!blueprint) {
    // Retry com prompt mais curto e explícito — última tentativa antes de falhar
    console.warn("[architect] First parse failed, retrying with explicit JSON prompt...");
    const retryResponse = await createWithFallback({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You output ONLY valid JSON. No text before or after. No thinking. No explanation.
Start with { and end with }. Nothing else.

Required structure:
{"title":"...","objective":"...","audience":"...","chapters":[{"id":"ch1","title":"...","intent":"...","position":1,"dependsOn":[],"estimatedLength":"medium","status":"pending"}],"globalRules":{"identity":"...","tone":"...","voice":"...","forbiddenLanguage":[],"mandatoryElements":[],"qualityCriteria":[]}}`,
        },
        {
          role: "user",
          content: `Create a document blueprint for this objective (respond in the same language as the objective): ${objective}`,
        },
      ],
    });

    const retryRaw = retryResponse.choices[0].message.content ?? "";
    let retryText = retryRaw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const rb1 = retryText.indexOf("{");
    const rb2 = retryText.lastIndexOf("}");
    if (rb1 !== -1 && rb2 !== -1 && rb2 > rb1) {
      retryText = retryText.slice(rb1, rb2 + 1);
    }
    blueprint = tryParse(retryText);
  }

  if (!blueprint) {
    // log raw para debug nos Render logs
    console.error("[architect] JSON parse failed. Raw output (first 500):", raw.substring(0, 500));
    throw new Error(`Architect falhou a parsear JSON: ${text.substring(0, 300)}`);
  }

  // garantir que todos os chapters têm status pending
  blueprint.chapters = (blueprint.chapters ?? []).map((ch) => ({
    ...ch,
    status: "pending" as const,
  }));
  return blueprint;
}
