import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DocumentArchitecture {
  layers: Layer[];
  voice: VoiceProfile;
  patterns: string[];
  documentType: string;
  depthLevel: "shallow" | "medium" | "deep" | "extreme";
}

export interface Layer {
  name: string;
  purpose: string;
  position: number;
  dependencies: string[];
}

export interface VoiceProfile {
  tone: string;
  authority: string;
  style: string;
  keyPhrases: string[];
  forbiddenPatterns: string[];
}

export async function analyzeDocument(
  content: string
): Promise<DocumentArchitecture> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You are an elite document architect. Your function is to dissect a document and extract its internal architecture with surgical precision.

LANGUAGE RULE: All fields in the JSON output must be written exclusively in English. No exceptions.

Analyse the provided document and extract:
1. Structural layers (identity, mission, competencies, rules, methodology, voice, limits, examples, validation)
2. Voice profile (tone, authority, style, key phrases, forbidden patterns)
3. Logical organisation patterns
4. Document type
5. Depth level

Respond ONLY with valid JSON, no markdown, no explanations. Exact format:
{
  "layers": [{"name": "...", "purpose": "...", "position": 1, "dependencies": []}],
  "voice": {"tone": "...", "authority": "...", "style": "...", "keyPhrases": [], "forbiddenPatterns": []},
  "patterns": ["..."],
  "documentType": "...",
  "depthLevel": "extreme"
}`,
    messages: [
      {
        role: "user",
        content: `Analyse this document and extract its architecture:\n\n${content.substring(0, 8000)}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  // strip markdown fences: ```json ... ``` ou ``` ... ```
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // extrair desde o primeiro { até ao último } (handle texto extra antes/depois)
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text) as DocumentArchitecture;
  } catch {
    // fallback se JSON inválido
    return {
      layers: [
        {
          name: "Identity",
          purpose: "Defines who the document is",
          position: 1,
          dependencies: [],
        },
        {
          name: "Mission",
          purpose: "Defines what the document does",
          position: 2,
          dependencies: ["Identity"],
        },
        {
          name: "Rules",
          purpose: "Defines how the document operates",
          position: 3,
          dependencies: ["Mission"],
        },
      ],
      voice: {
        tone: "authoritative",
        authority: "high",
        style: "directive",
        keyPhrases: [],
        forbiddenPatterns: [],
      },
      patterns: ["hierarchical structure", "absolute rules", "no exceptions"],
      documentType: "operational system",
      depthLevel: "extreme",
    };
  }
}
