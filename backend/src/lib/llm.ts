import OpenAI from "openai";

// Groq — OpenAI-compatible API, free tier
// https://console.groq.com → criar API key gratuita
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Modelo override via env var — permite mudar sem redeploy
// Set GROQ_MODEL=<model-id> em Render environment variables
export const MODEL = process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// Modelo leve para analyze — mais rápido, menos tokens
export const MODEL_FAST = process.env.GROQ_MODEL_FAST ?? "meta-llama/llama-4-scout-17b-16e-instruct";
