import OpenAI from "openai";

// Groq — OpenAI-compatible API, free tier
// https://console.groq.com → criar API key gratuita
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Modelo override via env var — permite mudar sem redeploy
// Set GROQ_MODEL=<model-id> em Render environment variables
// IDs confirmados no Groq free tier (nov 2026):
//   openai/gpt-oss-120b          — GPT OSS 120B (8K TPM)
//   llama-4-scout-17b-16e-instruct — Llama 4 Scout (30 RPM, 14400 RPD)
//   llama-3.3-70b-versatile      — Llama 3.3 70B (30 RPM, 14400 RPD)
//   qwen3-32b                    — Qwen3 32B (30 RPM, 14400 RPD)
export const MODEL = process.env.GROQ_MODEL ?? "llama-4-scout-17b-16e-instruct";

// Modelo leve para analyze — mais rápido, menos tokens
export const MODEL_FAST = process.env.GROQ_MODEL_FAST ?? "llama-4-scout-17b-16e-instruct";
