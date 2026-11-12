import OpenAI from "openai";

// Groq — OpenAI-compatible API, free tier
// https://console.groq.com → criar API key gratuita
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Modelo principal — GPT OSS 120B disponível no free tier do Groq
export const MODEL = "openai/gpt-oss-120b";

// Modelo leve para analyze — GPT OSS 20B, mais rápido
export const MODEL_FAST = "openai/gpt-oss-20b";
