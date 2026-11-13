// OPERATIONAL CONSTITUTION ENGINE — API client functions

const BASE = `${import.meta.env.VITE_API_URL ?? "https://project-forge-backend-2knl.onrender.com"}/api`;

export type ComplexityLevel = 'minimal' | 'standard' | 'deep' | 'full';
export type ExportFormat = 'markdown' | 'txt' | 'json' | 'pdf';

export interface ModuleGenerateRequest {
  moduleId: string;
  inputs: Record<string, string>;
  context: Record<string, string>;
  complexity: ComplexityLevel;
  model?: string;
}

export interface ModuleGenerateResponse {
  content: string;
  lineCount: number;
}

export interface CompileRequest {
  projectName: string;
  outputs: { moduleId: string; content: string; lineCount: number }[];
  complexity: ComplexityLevel;
}

export interface CompileResult {
  document: string;
  lineCount: number;
  sectionCount: number;
  wordCount: number;
  missingModules: string[];
}

export interface BenchmarkReport {
  totalScore: number;
  grade: string;
  criteriaScores: {
    id: string;
    name: string;
    weight: number;
    rawScore: number;
    weightedScore: number;
    findings: string[];
    strengths: string[];
  }[];
  overallFindings: string[];
  overallStrengths: string[];
  comparisonNote: string;
  lineCount: number;
  wordCount: number;
  sectionCount: number;
}

export interface AdversarialRequest {
  aiName: string;
  greetingText: string;
  identityStatement?: string;
}

export interface AdversarialReport {
  aiName: string;
  tests: {
    id: string;
    category: string;
    categoryLabel: string;
    attackPrompt: string;
    attackDescription: string;
    expectedBehavior: string;
    robustResponseMarkers: string[];
    failureMarkers: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  categoryBreakdown: Record<string, number>;
  testCount: number;
  generatedAt: string;
  instructions: string;
}

// Generate a module section (non-streaming)
export async function generateModule(req: ModuleGenerateRequest): Promise<ModuleGenerateResponse> {
  const res = await fetch(`${BASE}/constitution/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, stream: false }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Generate failed: ${res.status}`);
  }
  return res.json();
}

// Generate a module section with SSE streaming
export function generateModuleStream(
  req: ModuleGenerateRequest,
  onToken: (token: string) => void,
  onDone: (content: string) => void,
  onError: (err: string) => void
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/constitution/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        onError(err.error || `Generate failed: ${res.status}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError('No response body'); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { onError(data.error); return; }
            if (data.token) onToken(data.token);
            if (data.done) onDone(data.content ?? '');
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError((err as Error).message || 'Stream error');
      }
    }
  })();

  return () => controller.abort();
}

// Compile all module outputs into one document
export async function compileConstitution(req: CompileRequest): Promise<CompileResult> {
  const res = await fetch(`${BASE}/constitution/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Compile failed: ${res.status}`);
  }
  return res.json();
}

// Audit / benchmark-score a constitution
export async function auditConstitution(document: string): Promise<BenchmarkReport> {
  const res = await fetch(`${BASE}/constitution/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Audit failed: ${res.status}`);
  }
  return res.json();
}

// Generate adversarial test suite
export async function generateAdversarialTests(req: AdversarialRequest): Promise<AdversarialReport> {
  const res = await fetch(`${BASE}/constitution/adversarial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Adversarial failed: ${res.status}`);
  }
  return res.json();
}

// Export constitution — returns download URL trigger
export async function exportConstitution(
  document: string,
  projectName: string,
  format: ExportFormat,
  meta?: { lineCount?: number; wordCount?: number; sectionCount?: number; benchmarkScore?: number; grade?: string }
): Promise<Blob> {
  const res = await fetch(`${BASE}/constitution/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document, projectName, format, ...meta }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Export failed: ${res.status}`);
  }
  return res.blob();
}

// Helper: trigger a file download from a Blob
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
