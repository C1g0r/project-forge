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
//   openai/gpt-oss-120b   — GPT OSS 120B (8K TPM, 1000 RPD free)
//   openai/gpt-oss-20b    — GPT OSS 20B  (mais rápido, menos qualidade)
//   qwen/qwen3.8-27b      — Qwen 3.8-27B (alternativa)
export const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";

// Modelo leve para analyze — mais rápido, menos tokens
// gpt-oss-20b is faster but may not support all features (e.g. json_object)
// Using same model as MODEL for reliability
export const MODEL_FAST = process.env.GROQ_MODEL_FAST ?? "openai/gpt-oss-120b";
