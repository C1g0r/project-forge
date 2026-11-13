import OpenAI from "openai";

// Provider: coarena.ai — OpenAI-compatible proxy para Claude
// Env vars necessárias em Render:
//   ANTHROPIC_BASE_URL   = https://coarena.ai/api
//   ANTHROPIC_AUTH_TOKEN = coa_xxxx...  (a tua chave coarena)
//
// Fallback para Groq se ANTHROPIC_BASE_URL não estiver definido:
//   GROQ_API_KEY = gsk_xxxx...

const useCoarena = !!process.env.ANTHROPIC_BASE_URL;

export const llm = new OpenAI({
  apiKey:  useCoarena
    ? (process.env.ANTHROPIC_AUTH_TOKEN ?? "")
    : (process.env.GROQ_API_KEY ?? ""),
  baseURL: useCoarena
    ? process.env.ANTHROPIC_BASE_URL
    : "https://api.groq.com/openai/v1",
});

// Modelo principal — override via env var ANTHROPIC_MODEL ou GROQ_MODEL
// Modelos coarena.ai (Claude via proxy):
//   claude-opus-5-5        — máxima qualidade
//   claude-sonnet-5-5      — equilíbrio qualidade/velocidade
//   claude-haiku-5-5       — mais rápido
// Modelos Groq (fallback):
//   openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b
export const MODEL = useCoarena
  ? (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5")
  : (process.env.GROQ_MODEL ?? "openai/gpt-oss-20b");

export const MODEL_FAST = useCoarena
  ? (process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-5-5")
  : (process.env.GROQ_MODEL_FAST ?? "openai/gpt-oss-20b");

// Fallback chain — só activo no modo Groq
export const FALLBACK_MODELS: string[] = useCoarena
  ? [] // coarena não precisa de fallback chain (quota por token, não por modelo)
  : ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];

// Limites de output por modelo
const MODEL_MAX_OUTPUT: Record<string, number> = {
  "qwen/qwen3.8-27b": 900, // Groq free tier OTPM limit
};

/**
 * Wrapper para criar completions com fallback automático em caso de 429 TPD (Groq).
 * Em modo coarena: tenta apenas o modelo configurado, sem fallback.
 */
export async function createWithFallback(
  params: Parameters<typeof llm.chat.completions.create>[0]
): Promise<Awaited<ReturnType<typeof llm.chat.completions.create>>> {
  const models = [params.model as string, ...FALLBACK_MODELS.filter((m) => m !== params.model)];
  let lastErr: unknown;
  for (const model of models) {
    try {
      const modelCap = MODEL_MAX_OUTPUT[model];
      const requestedTokens = (params as { max_tokens?: number }).max_tokens;
      const cappedTokens = modelCap && requestedTokens && requestedTokens > modelCap
        ? modelCap
        : requestedTokens;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (llm.chat.completions.create as any)({ ...params, model, max_tokens: cappedTokens }) as any;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 429 && FALLBACK_MODELS.length > 0) {
        console.warn(`Model ${model} quota exhausted (429), trying next fallback...`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
