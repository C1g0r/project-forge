import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Provider detection ───────────────────────────────────────────────────────
// Priority:
//   LOCAL_LLM_URL set      → local llama.cpp / Ollama / LM Studio (OpenAI-compatible)
//   ANTHROPIC_BASE_URL set → coarena.ai  (Anthropic native SDK)
//   otherwise              → Groq        (OpenAI-compatible SDK)

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL ?? "";   // e.g. http://localhost:8080/v1
const useLocal    = !!LOCAL_LLM_URL;
const useCoarena  = !useLocal && !!process.env.ANTHROPIC_BASE_URL;
const useGroq     = !useLocal && !useCoarena;

// ─── Clients ──────────────────────────────────────────────────────────────────

// Local LLM client (OpenAI-compatible) — llama.cpp, Ollama, LM Studio
export const localClient = new OpenAI({
  apiKey:  process.env.LOCAL_LLM_API_KEY ?? "not-needed",   // llama.cpp / Ollama don't need a real key
  baseURL: LOCAL_LLM_URL || "http://localhost:8080/v1",
  timeout: 300_000,  // 5 min — CPU inference is slow
});

// Groq client (OpenAI-compatible) — só usado se useGroq = true
export const llm = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// coarena.ai client (Anthropic native) — só usado se useCoarena = true
export const anthropicClient = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  apiKey:  process.env.ANTHROPIC_AUTH_TOKEN ?? "",
});

// ─── Model names ─────────────────────────────────────────────────────────────
// local:    LOCAL_LLM_MODEL  (default: "local-model" — llama.cpp accepts any string)
// coarena:  ANTHROPIC_MODEL  (default: "claude-fable-5")
// Groq:     GROQ_MODEL       (default: "openai/gpt-oss-20b")

export const MODEL = useLocal
  ? (process.env.LOCAL_LLM_MODEL      ?? "local-model")
  : useCoarena
  ? (process.env.ANTHROPIC_MODEL      ?? "claude-fable-5")
  : (process.env.GROQ_MODEL           ?? "openai/gpt-oss-20b");

export const MODEL_FAST = useLocal
  ? (process.env.LOCAL_LLM_MODEL_FAST ?? process.env.LOCAL_LLM_MODEL ?? "local-model")
  : useCoarena
  ? (process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-5-5")
  : (process.env.GROQ_MODEL_FAST      ?? "openai/gpt-oss-20b");

// Fallback chain só activo no Groq
export const FALLBACK_MODELS: string[] = useGroq
  ? ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
  : [];

// Context window cap for local models (9B models typically 4096–8192)
const LOCAL_MAX_TOKENS = parseInt(process.env.LOCAL_LLM_MAX_TOKENS ?? "2048", 10);

const MODEL_MAX_OUTPUT: Record<string, number> = {
  "qwen/qwen3.8-27b": 900,
};

// ─── Unified response type ────────────────────────────────────────────────────
// Wrapper normalises both providers to { text: string }

export interface LLMResponse {
  text: string;
}

// ─── Unified chat call ────────────────────────────────────────────────────────
/**
 * Single entry-point for all LLM calls in generator.ts.
 * Accepts OpenAI-style message array + system string.
 * Routes to Anthropic SDK (coarena) or OpenAI SDK (Groq) transparently.
 */
export async function chat(params: {
  model?:      string;
  system?:     string;
  messages:    { role: "user" | "assistant"; content: string }[];
  max_tokens?: number;
}): Promise<LLMResponse> {
  const model      = params.model      ?? MODEL;
  const max_tokens = params.max_tokens ?? 8192;

  if (useCoarena) {
    // ── Anthropic native (coarena.ai) ─────────────────────────────────────
    const response = await anthropicClient.messages.create({
      model,
      max_tokens,
      system:   params.system,
      messages: params.messages,
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");
    return { text };

  } else if (useLocal) {
    // ── Local LLM (llama.cpp / Ollama / LM Studio) ────────────────────────
    const cappedTokens = Math.min(max_tokens, LOCAL_MAX_TOKENS);
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (params.system) {
      openaiMessages.push({ role: "system", content: params.system });
    }
    for (const m of params.messages) {
      openaiMessages.push({ role: m.role, content: m.content });
    }
    const result = await localClient.chat.completions.create({
      model,
      messages: openaiMessages,
      max_tokens: cappedTokens,
    }) as OpenAI.Chat.ChatCompletion;
    return { text: result.choices[0]?.message?.content ?? "" };

  } else {
    // ── Groq / OpenAI-compatible ──────────────────────────────────────────
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (params.system) {
      openaiMessages.push({ role: "system", content: params.system });
    }
    for (const m of params.messages) {
      openaiMessages.push({ role: m.role, content: m.content });
    }
    const result = await createWithFallback({
      model,
      messages: openaiMessages,
      max_tokens,
    });
    return { text: result.choices[0]?.message?.content ?? "" };
  }
}

// ─── Groq fallback wrapper (kept for internal use by chat()) ─────────────────
export async function createWithFallback(
  params: Parameters<typeof llm.chat.completions.create>[0]
): Promise<OpenAI.Chat.ChatCompletion> {
  const models = [params.model as string, ...FALLBACK_MODELS.filter(m => m !== params.model)];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const modelCap       = MODEL_MAX_OUTPUT[model];
      const requestedTokens = (params as { max_tokens?: number }).max_tokens;
      const cappedTokens   = modelCap && requestedTokens && requestedTokens > modelCap
        ? modelCap : requestedTokens;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (llm.chat.completions.create as any)({ ...params, model, max_tokens: cappedTokens }) as any;
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 429 && FALLBACK_MODELS.length > 0) {
        console.warn(`Model ${model} quota exhausted (429), trying next…`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
