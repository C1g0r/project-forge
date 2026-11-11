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
    system: `És um arquiteto de documentos de elite. A tua função é dissecar um documento e extrair a sua arquitetura interna com precisão cirúrgica.

Analisa o documento fornecido e extrai:
1. As camadas estruturais (identidade, missão, competências, regras, metodologia, voz, limites, exemplos, validação)
2. O perfil de voz (tom, autoridade, estilo, frases-chave, padrões proibidos)
3. Os padrões de organização lógica
4. O tipo de documento
5. O nível de profundidade

Responde APENAS com JSON válido, sem markdown, sem explicações. Formato exacto:
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
        content: `Analisa este documento e extrai a sua arquitectura:\n\n${content.substring(0, 8000)}`,
      },
    ],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  // strip markdown fences: ```json ... ``` ou ``` ... ```
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  try {
    return JSON.parse(text) as DocumentArchitecture;
  } catch {
    // fallback se JSON inválido
    return {
      layers: [
        {
          name: "Identidade",
          purpose: "Define quem é o documento",
          position: 1,
          dependencies: [],
        },
        {
          name: "Missão",
          purpose: "Define o que o documento faz",
          position: 2,
          dependencies: ["Identidade"],
        },
        {
          name: "Regras",
          purpose: "Define como o documento opera",
          position: 3,
          dependencies: ["Missão"],
        },
      ],
      voice: {
        tone: "autoritário",
        authority: "alto",
        style: "directivo",
        keyPhrases: [],
        forbiddenPatterns: [],
      },
      patterns: ["estrutura hierárquica", "regras absolutas", "sem excepções"],
      documentType: "sistema operacional",
      depthLevel: "extreme",
    };
  }
}
