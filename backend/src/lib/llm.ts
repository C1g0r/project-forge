import OpenAI from "openai";

// Groq — OpenAI-compatible API, free tier
// https://console.groq.com → criar API key gratuita
export const llm = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Modelo principal — llama-3.3-70b segue instruções JSON com alta fiabilidade
export const MODEL = "llama-3.3-70b-versatile";

// Modelo leve para analyze (mais rápido, tokens mais baratos)
export const MODEL_FAST = "llama-3.1-8b-instant";
