import OpenAI from "openai";

// Groq — OpenAI-compatible API, free tier
// https://console.groq.com → criar API key gratuita
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Modelo override via env var — permite mudar sem redeploy
// Set GROQ_MODEL=<model-id> em Render environment variables
// IDs confirmados nesta instância Groq (nov 2026):
//   openai/gpt-oss-120b   — GPT OSS 120B (8K TPM, 1000 RPD, 200K TPD free)
//   openai/gpt-oss-20b    — GPT OSS 20B  (mais rápido, quota separada)
//   qwen/qwen3.8-27b      — Qwen 3.8-27B (alternativa)
export const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

// Modelo leve para analyze — usa 20b para quota separada do 120b
export const MODEL_FAST = process.env.GROQ_MODEL_FAST ?? "openai/gpt-oss-20b";

// Lista de modelos de fallback quando o primário estiver com quota esgotada
export const FALLBACK_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b"];

/**
 * Wrapper para criar completions com fallback automático em caso de 429 TPD.
 * Tenta cada modelo da lista até um ter quota disponível.
 */
export async function createWithFallback(
  params: Parameters<typeof llm.chat.completions.create>[0]
): Promise<Awaited<ReturnType<typeof llm.chat.completions.create>>> {
  const models = [params.model as string, ...FALLBACK_MODELS.filter((m) => m !== params.model)];
  let lastErr: unknown;
  for (const model of models) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (llm.chat.completions.create as any)({ ...params, model }) as any;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 429) {
        console.warn(`Model ${model} quota exhausted (429), trying next fallback...`);
        lastErr = err;
        continue;
      }
      throw err; // non-429 error — propagate immediately
    }
  }
  throw lastErr; // all models exhausted
}
