/// <reference types="vite/client" />
const BASE = `${import.meta.env.VITE_API_URL ?? "https://project-forge-backend-2knl.onrender.com"}/api`;

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada. O servidor foi reiniciado. Recomeça o processo a partir do início.");
    this.name = "SessionExpiredError";
  }
}

export async function analyzeDocument(content: string) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const j = await res.json();
    throw new Error(j.detail || j.error);
  }
  return res.json();
}

// Wake up the backend (Render free tier hibernates after inactivity).
// Returns true if the server responded quickly (already up), false if hibernating.
// Either way, the server will eventually respond — this is just for UX feedback.
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/models`, { signal: AbortSignal.timeout(5000) });
    return res.ok || res.status < 500; // any HTTP response = server is up
  } catch {
    return false; // timeout or network error = server is waking up
  }
}

export async function buildBlueprint(objective: string, architecture: unknown) {
  const res = await fetch(`${BASE}/architect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objective, architecture }),
    signal: AbortSignal.timeout(90000), // 90s — Render pode demorar até 60s a acordar
  });
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j.detail || j.error || ""; } catch { /* ignore */ }
    if (res.status === 429) throw new Error("Quota do modelo IA esgotada. Tenta novamente em alguns minutos.");
    if (res.status >= 500) throw new Error(detail || "Erro no servidor. Tenta novamente.");
    throw new Error(detail || `Erro ${res.status}`);
  }
  return res.json();
}

export async function getSession(sid: string) {
  const res = await fetch(`${BASE}/session/${sid}`);
  if (res.status === 404) throw new SessionExpiredError();
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateBlueprintRemote(
  sid: string,
  blueprint: unknown
) {
  const res = await fetch(`${BASE}/session/${sid}/blueprint`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blueprint }),
  });
  if (res.status === 404) throw new SessionExpiredError();
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export function streamChapter(
  sid: string,
  chapterId: string,
  callbacks: {
    onToken: (t: string) => void;
    onDone: (content: string) => void;
    onError: (e: string) => void;
  }
): () => void {
  const { onToken, onDone, onError } = callbacks;

  const es = new EventSource(`${BASE}/session/${sid}/write/${chapterId}`);

  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.token) onToken(data.token);
    if (data.done) {
      onDone(data.content);
      es.close();
    }
    if (data.error) {
      onError(data.error);
      es.close();
    }
  };

  es.onerror = (e) => {
    // EventSource doesn't expose HTTP status codes directly,
    // but a 404 from a restarted server causes an immediate error event
    // with readyState CLOSED. We surface a friendly session-expired message.
    const target = e.target as EventSource;
    if (target.readyState === EventSource.CLOSED) {
      onError("Sessão expirada. O servidor foi reiniciado. Recomeça o processo a partir do início.");
    } else {
      onError("Ligação perdida.");
    }
    es.close();
  };

  return () => es.close();
}

export async function validateDocument(sid: string) {
  const res = await fetch(`${BASE}/session/${sid}/validate`, {
    method: "POST",
  });
  if (res.status === 404) throw new SessionExpiredError();
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  // backend wraps report in { report: {...} }
  return data.report ?? data;
}

export function streamImproveDocument(
  sid: string,
  callbacks: {
    onChapter: (chapterId: string, title: string, status: "start" | "done" | "skip") => void;
    onDone: (result: { improvedCount: number; skippedCount: number }) => void;
    onError: (e: string) => void;
  }
): () => void {
  const { onChapter, onDone, onError } = callbacks;

  // We need POST but SSE requires GET-like setup — use fetch with ReadableStream
  let aborted = false;
  const abort = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/session/${sid}/improve`, {
        method: "POST",
        signal: abort.signal,
      });

      if (res.status === 404) { onError("Sessão expirada."); return; }
      if (!res.ok) { const j = await res.json(); onError(j.error ?? "Erro"); return; }

      const reader = res.body?.getReader();
      if (!reader) { onError("Stream não suportado."); return; }

      const decoder = new TextDecoder();
      let buf = "";

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.error) { onError(data.error); return; }
          if (data.done) { onDone(data.result); return; }
          if (data.chapterId) onChapter(data.chapterId, data.title, data.status);
        }
      }
    } catch (err) {
      if (!aborted) onError(err instanceof Error ? err.message : "Ligação perdida.");
    }
  })();

  return () => { aborted = true; abort.abort(); };
}

export function exportMarkdownUrl(sid: string): string {
  return `${BASE}/session/${sid}/export/markdown`;
}

export function exportValidationUrl(sid: string): string {
  return `${BASE}/session/${sid}/export/validation`;
}

// ── MODULES REVIEW (AI Logic Reviewer para sistema de 7 módulos) ─────────────

export interface ModulePayload {
  id: string;
  label: string;
  content: string;
}

export interface AIReviewIssue {
  module: string;
  moduleLabel: string;
  severity: "critical" | "warning" | "info";
  description: string;
  suggestion: string;
}

export interface AIReviewReport {
  score: number;
  verdict: string;
  issues: AIReviewIssue[];
  strengths: string[];
}

// ── MODULES EXPORT (PDF / DOCX) ──────────────────────────────────────────────

export type ExportFormat = "pdf" | "docx";

export interface ExportModulePayload {
  id: string;
  label: string;
  content: string;
}

export async function exportModules(
  projectName: string,
  modules: ExportModulePayload[],
  format: ExportFormat
): Promise<void> {
  const res = await fetch(`${BASE}/modules/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName, modules, format }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || j.error || "";
    } catch { /* ignore */ }
    throw new Error(detail || `Erro ${res.status} ao exportar ${format.toUpperCase()}.`);
  }

  // Trigger browser download
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = projectName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "documento";
  a.download = `${safeName}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function reviewModules(
  projectName: string,
  modules: ModulePayload[]
): Promise<AIReviewReport> {
  const res = await fetch(`${BASE}/modules/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectName, modules }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.detail || j.error || "";
    } catch {
      /* ignore */
    }
    if (res.status === 429)
      throw new Error("Quota do modelo IA esgotada. Tenta novamente em alguns minutos.");
    throw new Error(detail || `Erro ${res.status}`);
  }
  const data = await res.json();
  return data.report as AIReviewReport;
}

// ── PROMPT LABORATORY — optimization (real model call, never simulated) ──────

export interface OptimizeChange {
  type: "added" | "removed" | "restructured" | "clarified";
  description: string;
}

export interface OptimizeResult {
  optimized: string;
  changes: OptimizeChange[];
  model: string;
  latencyMs: number;
}

export async function optimizePrompt(
  prompt: string,
  targetModel: string,
  goal: string,
  signal?: AbortSignal
): Promise<OptimizeResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/prompt/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, targetModel, goal }),
      signal: signal ?? AbortSignal.timeout(120000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new Error("Could not reach the AI backend. Check that it is running and reachable.");
  }
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = j.detail || j.error || ""; } catch { /* ignore */ }
    if (res.status === 404) throw new Error("The running backend does not have the optimization endpoint yet. Update and restart it.");
    if (res.status === 429) throw new Error("The AI model quota is exhausted. Try again in a few minutes.");
    throw new Error(detail || `Error ${res.status} while optimizing.`);
  }
  return res.json();
}
