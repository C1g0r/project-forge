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

export async function buildBlueprint(objective: string, architecture: unknown) {
  const res = await fetch(`${BASE}/architect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objective, architecture }),
  });
  if (!res.ok) {
    const j = await res.json();
    throw new Error(j.detail || j.error);
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

export function exportMarkdownUrl(sid: string): string {
  return `${BASE}/session/${sid}/export/markdown`;
}

export function exportValidationUrl(sid: string): string {
  return `${BASE}/session/${sid}/export/validation`;
}
