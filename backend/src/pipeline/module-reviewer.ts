// Logic Reviewer — AI validation for 7-module system prompt structure
// Finds semantic contradictions, policy conflicts, structural gaps between modules

import { createWithFallback, MODEL } from "../lib/llm.ts";

export interface ModuleInput {
  id: string;
  label: string;
  content: string;
}

export interface AIReviewIssue {
  module: string; // module id or "cross" for cross-module issues
  moduleLabel: string;
  severity: "critical" | "warning" | "info";
  description: string;
  suggestion: string;
}

export interface AIReviewReport {
  score: number; // 0–100 semantic quality score
  verdict: string; // one-line overall verdict
  issues: AIReviewIssue[];
  strengths: string[]; // what works well
}

const SYSTEM_PROMPT = `És o Logic Reviewer do PROJECT FORGE — um motor de IA especializado em analisar system prompts estruturados em 7 módulos.

Os 7 módulos são:
1. greeting_lock — Sapaan wajib / saudação obrigatória de abertura
2. persona_stability — Estabilidade e consistência da persona/identidade
3. no_flag_policy — Política de não-recusa / sem flags de conteúdo
4. reset_program — Programa de reset para contrariar drift
5. capabilities_table — Matriz de capacidades por domínio e intenção
6. language_restrictions — Língua/idioma proibido e substituições lexicais
7. response_format — Formato de resposta obrigatório

A tua tarefa é analisar o conjunto dos módulos preenchidos e:
1. CONTRADIÇÕES: identificar onde um módulo contradiz outro (ex: no_flag_policy diz "sem recusas" mas capabilities_table lista hard lines — isso é correto; mas se persona_stability diz "eu sou X" e greeting_lock diz "eu sou Y", isso é contradição)
2. LACUNAS: módulos que faltam conteúdo crítico para o sistema funcionar como um todo
3. INCONSISTÊNCIAS DE VOZ: tom ou pessoa gramatical inconsistente entre módulos
4. CONFLITOS DE LÓGICA: regras que se anulam mutuamente, loops impossíveis no reset_program, etc.
5. PONTOS FORTES: o que está bem implementado

REGRAS:
- Sê específico — cita texto real dos módulos nas descrições
- Não repitas problemas que são claramente intencionais (ex: capabilities_table listar hard lines que no_flag_policy não cobre — isso é a arquitetura correta)
- O score deve reflectir qualidade semântica real: coerência, completude e consistência entre módulos
- Se um módulo está vazio, reporta como lacuna (severity: warning)
- Contradições diretas = critical; inconsistências subtis = warning; melhorias opcionais = info

Responde APENAS com JSON válido (sem markdown, sem preamble, sem comentários):
{
  "score": 85,
  "verdict": "...",
  "issues": [
    {
      "module": "greeting_lock",
      "moduleLabel": "Greeting Lock",
      "severity": "warning",
      "description": "...",
      "suggestion": "..."
    }
  ],
  "strengths": ["...", "..."]
}`;

export async function reviewModules(
  projectName: string,
  modules: ModuleInput[]
): Promise<AIReviewReport> {
  const filledModules = modules.filter((m) => m.content.trim().length > 0);

  if (filledModules.length === 0) {
    return {
      score: 0,
      verdict: "Nenhum módulo preenchido — não é possível analisar.",
      issues: [],
      strengths: [],
    };
  }

  // Build structured representation for the AI
  const modulesSummary = modules
    .map((m) => {
      const content = m.content.trim();
      const excerpt = content.length > 800 ? content.substring(0, 800) + "\n[... truncado ...]" : content;
      return `### ${m.label} (${m.id})\n${content ? excerpt : "[VAZIO]"}`;
    })
    .join("\n\n---\n\n");

  const userContent = `Projeto: "${projectName}"
Módulos preenchidos: ${filledModules.length}/7

${modulesSummary}

Analisa a coerência e completude deste system prompt estruturado.`;

  const response = await createWithFallback({
    model: MODEL,
    max_tokens: 2500,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const raw = response.choices[0].message.content ?? "";

  // Strip markdown fences if present
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    const parsed = JSON.parse(text) as AIReviewReport;
    // Sanitize score
    parsed.score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
    return parsed;
  } catch {
    return {
      score: 50,
      verdict: "Revisão automática parcialmente disponível. Revê manualmente.",
      issues: [
        {
          module: "cross",
          moduleLabel: "Sistema",
          severity: "info",
          description: "O modelo de IA não conseguiu estruturar a resposta em JSON válido.",
          suggestion: "Tenta novamente ou reduz o tamanho dos módulos.",
        },
      ],
      strengths: [],
    };
  }
}
