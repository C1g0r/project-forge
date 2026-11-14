import { chat } from "../lib/llm.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PromptBuildRequest {
  module: string;
  subcategory: string;
  buildLevel: "basic" | "advanced" | "expert" | "ultra";
  targetModel: string;
  intent: string;
  parameters: Record<string, string>;
}

export interface QualityReport {
  score: number;
  criteria: {
    clarity: number;
    precision: number;
    context: number;
    structure: number;
    specificity: number;
    coherence: number;
  };
  issues: string[];
  suggestions: string[];
}

export interface GeneratedPrompt {
  id: string;
  prompt: string;
  module: string;
  subcategory: string;
  targetModel: string;
  level: string;
  createdAt: string;
  quality: QualityReport & { coverage: number };
  _meta: {
    intent: string;
    wordCount: number;
    characterCount: number;
    phasesCompleted: number;
  };
}

// ── Build level descriptions ──────────────────────────────────────────────────

const BUILD_LEVEL_DESC: Record<string, string> = {
  basic: "concise, clear, beginner-friendly. Focus on the essentials only. 1–2 paragraphs.",
  advanced: "detailed, structured, with context and examples. 2–4 paragraphs.",
  expert: "comprehensive, technically precise, includes edge cases, constraints, and formatting instructions. 4–7 paragraphs.",
  ultra: "maximum depth — exhaustive context, multi-step instructions, examples, counter-examples, output format, tone, style guide, error handling, and iterative refinement hints. 7+ paragraphs or structured blocks.",
};

// ── Module-specific guidance ──────────────────────────────────────────────────

const MODULE_GUIDANCE: Record<string, string> = {
  image: "Include style, composition, lighting, color palette, mood, artistic movement/medium, camera/lens details if relevant, and negative prompts for image generation models.",
  video: "Include scene description, camera movement, duration, pacing, transitions, visual style, color grading, and audio notes.",
  music: "Include genre, tempo (BPM), key/scale, instrumentation, mood, production style, reference artists, and structure (intro/verse/chorus).",
  text: "Include tone, voice, audience, length, structure, SEO keywords if applicable, and writing style guidelines.",
  code: "Include programming language, framework/library versions, architecture pattern, error handling requirements, testing expectations, and documentation style.",
  design3d: "Include style, materials, lighting setup, rendering engine, polygon budget if relevant, texture resolution, and reference images description.",
  business: "Include business context, target audience, desired outcomes, KPIs, format (report/pitch/email), and professional tone.",
  automation: "Include trigger conditions, input/output formats, error handling, logging requirements, and integration points.",
  science: "Include hypothesis format, methodology, data types, statistical methods, visualization requirements, and citation style.",
  gamedev: "Include game engine, genre, art style, mechanics to implement, platform targets, and performance constraints.",
  voice: "Include speaking style, pace, emotional tone, accent if relevant, SSML hints, and use-case context.",
  universal: "Adapt to the specific task. Prioritize clarity, context, and actionability.",
};

// ── Model-specific optimization hints ────────────────────────────────────────

const MODEL_HINTS: Record<string, string> = {
  "GPT-4o": "Use markdown formatting, numbered lists, and explicit output format instructions. GPT-4o responds well to role-setting and step-by-step breakdowns.",
  "GPT-4o mini": "Keep instructions concise. Use direct commands. Avoid overly complex nested instructions.",
  "o1": "Use clear, logical problem statements. o1 excels at complex reasoning — give it the full problem context without over-constraining the solution path.",
  "o3-mini": "Similar to o1. Present the problem clearly with constraints. Let the model reason through the solution.",
  "Claude 3.5 Sonnet": "Use XML tags for structure (<context>, <instructions>, <output_format>). Claude responds well to explicit persona assignments and nuanced reasoning tasks.",
  "Claude Opus": "Provide rich context. Use XML structuring. Excellent for complex, multi-step reasoning and nuanced creative work.",
  "Claude Haiku": "Be concise and direct. Great for classification, extraction, and structured output tasks.",
  "Gemini 2.0 Flash": "Use clear headers and structured prompts. Gemini benefits from explicit output format specification.",
  "Gemini Pro": "Similar to Gemini Flash but handles longer context. Use structured prompts with clear sections.",
  "DeepSeek V3": "Excellent for code and technical tasks. Be explicit about language, framework, and coding standards.",
  "Midjourney": "Use descriptive keywords separated by commas. Include style modifiers, artist references, and quality tags like --ar 16:9 --style raw.",
  "DALL·E 3": "Use descriptive natural language. Specify art style, lighting, composition, and mood clearly. DALL·E 3 handles natural prose well.",
  "Stable Diffusion": "Use short keyword phrases. Include LoRA/style tokens if applicable. Add negative prompts. Specify sampler and steps in metadata.",
  "FLUX.1": "Use detailed descriptions with artistic style keywords. FLUX responds well to natural language descriptions with specific visual details.",
  "Suno": "Include genre, mood, instrumentation, tempo, and brief lyrical theme. Suno uses natural description.",
  "Runway Gen-4": "Describe the scene cinematically — camera angle, motion, lighting, subject action, and atmosphere.",
};

// ── Core generation engine ────────────────────────────────────────────────────

export async function generatePrompt(req: PromptBuildRequest): Promise<GeneratedPrompt> {
  const levelDesc = BUILD_LEVEL_DESC[req.buildLevel] ?? BUILD_LEVEL_DESC.advanced;
  const moduleGuide = MODULE_GUIDANCE[req.module] ?? MODULE_GUIDANCE.universal;
  const modelHint = MODEL_HINTS[req.targetModel] ?? `Optimize for ${req.targetModel}.`;

  // Build parameter context string
  const paramContext = Object.entries(req.parameters)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n");

  const systemPrompt = `You are PROMPT FORGE, a world-class AI prompt engineering engine.
Your task is to generate a professional, production-ready prompt based on the user's intent and configuration.

You operate in 10 phases internally:
1. Intent Analysis — understand the core goal
2. Requirement Extraction — extract explicit and implicit requirements
3. Domain Intelligence — apply domain-specific best practices
4. Model Intelligence — optimize for the target AI model
5. Prompt Architecture — design the prompt structure
6. Prompt Compilation — write the first draft
7. Optimization — refine for clarity, precision, and effectiveness
8. Quality Assurance — score against 6 criteria
9. Issue Detection — identify any weaknesses
10. Final Delivery — produce the polished output

You MUST respond with a valid JSON object in this exact structure:
{
  "prompt": "<the generated prompt text>",
  "quality": {
    "score": <0-100 integer>,
    "criteria": {
      "clarity": <0-100>,
      "precision": <0-100>,
      "context": <0-100>,
      "structure": <0-100>,
      "specificity": <0-100>,
      "coherence": <0-100>
    },
    "issues": ["<issue 1>", "<issue 2>"],
    "suggestions": ["<suggestion 1>", "<suggestion 2>"]
  }
}

The "prompt" field must contain ONLY the final engineered prompt text — no explanation, no meta-commentary, no preamble. It must be ready to paste directly into the target AI.`;

  const userMessage = `PROMPT FORGE REQUEST
====================
Module: ${req.module.toUpperCase()}
Subcategory: ${req.subcategory}
Build Level: ${req.buildLevel.toUpperCase()} — ${levelDesc}
Target Model: ${req.targetModel}
User Intent: ${req.intent}

${paramContext ? `Configuration Parameters:\n${paramContext}\n` : ""}
Module-Specific Guidance:
${moduleGuide}

Target Model Optimization:
${modelHint}

Generate a ${req.buildLevel}-level prompt for ${req.targetModel} that fulfills the intent above.
Apply all 10 phases. Return only the JSON response.`;

  const response = await chat({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    max_tokens: 4096,
  });

  // Parse JSON response
  let parsed: { prompt: string; quality: { score: number; criteria: Record<string, number>; issues: string[]; suggestions: string[] } };

  try {
    // Extract JSON block if wrapped in markdown
    const raw = response.text.trim();
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const jsonStr = jsonMatch[1]?.trim() ?? raw;
    parsed = JSON.parse(jsonStr);
  } catch {
    // Fallback: treat the entire response as the prompt with default quality
    parsed = {
      prompt: response.text.trim(),
      quality: {
        score: 70,
        criteria: { clarity: 70, precision: 70, context: 70, structure: 70, specificity: 70, coherence: 70 },
        issues: ["Quality analysis unavailable — JSON parsing failed."],
        suggestions: ["Re-generate with a more capable model for full quality analysis."],
      },
    };
  }

  const promptText = parsed.prompt ?? response.text.trim();
  const quality = parsed.quality ?? {
    score: 70,
    criteria: { clarity: 70, precision: 70, context: 70, structure: 70, specificity: 70, coherence: 70 },
    issues: [],
    suggestions: [],
  };

  // Normalize criteria values to 0–100 range
  const criteria = {
    clarity:     Math.min(100, Math.max(0, Math.round(quality.criteria?.clarity ?? 70))),
    precision:   Math.min(100, Math.max(0, Math.round(quality.criteria?.precision ?? 70))),
    context:     Math.min(100, Math.max(0, Math.round(quality.criteria?.context ?? 70))),
    structure:   Math.min(100, Math.max(0, Math.round(quality.criteria?.structure ?? 70))),
    specificity: Math.min(100, Math.max(0, Math.round(quality.criteria?.specificity ?? 70))),
    coherence:   Math.min(100, Math.max(0, Math.round(quality.criteria?.coherence ?? 70))),
  };

  // Recalculate overall score as weighted average
  const score = Math.round(
    (criteria.clarity * 0.20 +
     criteria.precision * 0.20 +
     criteria.context * 0.15 +
     criteria.structure * 0.15 +
     criteria.specificity * 0.20 +
     criteria.coherence * 0.10)
  );

  // Coverage: ratio of module guidance points addressed (heuristic based on prompt length)
  const coverage = Math.min(100, Math.round((promptText.length / 500) * 100));

  return {
    id: `pf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    // Field names aligned with frontend GeneratedPrompt type
    prompt: promptText,
    module: req.module,
    subcategory: req.subcategory,
    targetModel: req.targetModel,
    level: req.buildLevel,
    createdAt: new Date().toISOString(),
    quality: {
      score,
      criteria,
      issues: Array.isArray(quality.issues) ? quality.issues : [],
      suggestions: Array.isArray(quality.suggestions) ? quality.suggestions : [],
      coverage,
    },
    // Extra metadata for debugging / future use
    _meta: {
      intent: req.intent,
      wordCount: promptText.split(/\s+/).filter(Boolean).length,
      characterCount: promptText.length,
      phasesCompleted: 10,
    },
  };
}
