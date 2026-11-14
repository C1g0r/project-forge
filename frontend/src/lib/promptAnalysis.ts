// ─── PROMPT FORGE — Prompt analysis engine ──────────────────────────────────
// Deterministic, explainable heuristics shared by the Canvas and the Laboratory.
// Every score carries the evidence it was derived from. Scores describe how a
// prompt is written; they never predict how a model will respond.

export type MetricId =
  | 'clarity'
  | 'completeness'
  | 'specificity'
  | 'consistency'
  | 'structure'
  | 'context'
  | 'constraints'
  | 'compatibility';

export interface MetricResult {
  id: MetricId;
  label: string;
  score: number;            // 0–100
  summary: string;          // one-line reason for the score
  evidence: string[];       // what was found in the text
  advice: string[];         // what would raise the score
}

export interface PromptAnalysis {
  metrics: MetricResult[];
  overall: number;
  words: number;
  chars: number;
  lines: number;
  estTokens: number;
  sections: string[];
  parameters: Record<string, string>;
}

export const METRIC_LABELS: Record<MetricId, string> = {
  clarity: 'Clarity',
  completeness: 'Completeness',
  specificity: 'Specificity',
  consistency: 'Consistency',
  structure: 'Structure',
  context: 'Context Quality',
  constraints: 'Constraint Quality',
  compatibility: 'Model Compatibility',
};

// ─── Text helpers ───────────────────────────────────────────────────────────

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => words(s).length > 0);
}

/** Section headings: markdown headers, `LABEL:` lines and XML-style tags. */
export function extractSections(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    let m = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (m) { out.push(m[1].trim()); continue; }
    m = line.match(/^\*\*(.+?)\*\*:?$/);
    if (m) { out.push(m[1].trim()); continue; }
    m = line.match(/^([A-Z][A-Za-z /&-]{2,32}):\s*$/);
    if (m) { out.push(m[1].trim()); continue; }
    m = line.match(/^<([a-z_][\w-]*)>\s*$/i);
    if (m) { out.push(m[1].trim()); continue; }
  }
  return out;
}

/** `key: value` / `key = value` pairs that look like generation parameters. */
export function extractParameters(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /\b(temperature|top[_ -]?p|top[_ -]?k|max[_ -]?tokens|seed|steps|cfg(?:[_ -]?scale)?|aspect[_ -]?ratio|resolution|language|tone|length|format|model)\s*[:=]\s*([^\n.;,]+(?:\.\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out[m[1].toLowerCase().replace(/[_ -]/g, ' ').trim()] = m[2].trim();
  }
  return out;
}

const VAGUE = [
  'something', 'somehow', 'stuff', 'things', 'etc', 'and so on', 'maybe', 'perhaps',
  'kind of', 'sort of', 'some kind', 'whatever', 'nice', 'good', 'better', 'interesting',
  'appropriate', 'as needed', 'if possible', 'various', 'several',
  'algo', 'coisas', 'talvez', 'mais ou menos', 'qualquer coisa', 'bom', 'melhor', 'interessante',
];

const IMPERATIVE = [
  'write', 'create', 'generate', 'produce', 'analyze', 'analyse', 'summarize', 'summarise',
  'explain', 'describe', 'list', 'compare', 'translate', 'design', 'build', 'review',
  'classify', 'extract', 'rewrite', 'draft', 'evaluate', 'return', 'provide', 'identify',
  'escreve', 'cria', 'gera', 'produz', 'analisa', 'resume', 'explica', 'descreve', 'lista',
  'compara', 'traduz', 'desenha', 'constrói', 'revê', 'classifica', 'extrai', 'reescreve',
  'avalia', 'devolve', 'fornece', 'identifica',
];

const ROLE_RE = /\b(you are|act as|your role|as an? [a-z]+ (expert|specialist|engineer|writer|analyst)|és um|és uma|atua como|age como|o teu papel)\b/i;
const CONTEXT_RE = /\b(context|background|audience|situation|scenario|currently|because|in order to|so that|contexto|público|situação|cenário|atualmente|porque|para que|de modo a)\b/i;
const FORMAT_RE = /\b(json|markdown|table|bullet|list|csv|xml|yaml|html|paragraph|heading|format|schema|tabela|lista|parágrafo|formato|esquema)\b/i;
const CONSTRAINT_RE = /\b(do not|don't|never|avoid|must not|without|only|at most|at least|no more than|no fewer than|maximum|minimum|limit|não|nunca|evita|sem|apenas|somente|no máximo|no mínimo|máximo|mínimo|limite)\b/gi;
const QUALITY_RE = /\b(success|criteria|quality|must include|should include|verify|check that|ensure|sucesso|critérios|qualidade|deve incluir|verifica|garante)\b/i;
const EXAMPLE_RE = /\b(example|e\.g\.|for instance|such as|sample|input:|output:|exemplo|por exemplo|tal como|amostra)\b/i;

/** Pairs of instructions that pull in opposite directions when both present. */
const CONTRADICTIONS: { a: RegExp; b: RegExp; label: string }[] = [
  { a: /\b(concise|brief|short|succinct|conciso|breve|curto|sucinto)\b/i, b: /\b(detailed|comprehensive|exhaustive|in[- ]depth|extensive|thorough|detalhado|exaustivo|aprofundado|extenso)\b/i, label: 'asks to be brief and also exhaustive' },
  { a: /\b(formal|professional tone|tom formal)\b/i, b: /\b(casual|informal|playful|slang|descontraído|brincalhão|calão)\b/i, label: 'asks for a formal and an informal tone' },
  { a: /\b(only|just|exclusively) (return|output|respond with) (the )?json\b|\bjson only\b|\bapenas json\b/i, b: /\b(explain your reasoning|add commentary|include an explanation|explica o raciocínio|inclui uma explicação)\b/i, label: 'asks for JSON only and also for explanations' },
  { a: /\b(no|without|avoid|sem|evita) (any )?(emojis?|emoji)\b/i, b: /\b(use|add|include|usa|adiciona|inclui) (some |a few )?emojis?\b/i, label: 'forbids and requests emojis' },
  { a: /\b(do not|don't|never|não) (use |include |uses? )?(bullet|lists?|listas?)\b/i, b: /\b(as a|in a|use a|usa uma|numa) (bulleted |numbered )?(list|lista)\b/i, label: 'forbids and requests lists' },
  { a: /\b(simple|plain|beginner|layman|simples|iniciante|leigo)\b/i, b: /\b(technical jargon|highly technical|expert-level|jargão técnico|altamente técnico)\b/i, label: 'asks for plain and highly technical language' },
  { a: /\b(objective|neutral|unbiased|objetivo|neutro|imparcial)\b/i, b: /\b(persuasive|opinionated|take a side|persuasivo|opinativo|toma partido)\b/i, label: 'asks to be neutral and also persuasive' },
];

export function findContradictions(text: string): string[] {
  return CONTRADICTIONS.filter((c) => c.a.test(text) && c.b.test(text)).map((c) => c.label);
}

function normalizeLine(l: string): string {
  return l.toLowerCase().replace(/^[\s\-*•\d.)]+/, '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
}

/** Non-trivial lines that appear more than once. */
export function findDuplicateLines(text: string): string[] {
  const seen = new Map<string, number>();
  const original = new Map<string, string>();
  for (const raw of text.split('\n')) {
    const n = normalizeLine(raw);
    if (words(n).length < 3) continue;
    seen.set(n, (seen.get(n) ?? 0) + 1);
    if (!original.has(n)) original.set(n, raw.trim());
  }
  return [...seen.entries()].filter(([, c]) => c > 1).map(([n]) => original.get(n)!);
}

// ─── Model profiles (public, documented traits only) ────────────────────────

export interface ModelProfile {
  id: string;
  label: string;
  provider: string;
  kind: 'chat' | 'image';
  contextTokens: number;
}

export const MODEL_PROFILES: ModelProfile[] = [
  { id: 'gpt-4o',            label: 'GPT-4o',            provider: 'OpenAI',    kind: 'chat', contextTokens: 128000 },
  { id: 'gpt-4o-mini',       label: 'GPT-4o Mini',       provider: 'OpenAI',    kind: 'chat', contextTokens: 128000 },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', kind: 'chat', contextTokens: 200000 },
  { id: 'claude-haiku-3-5',  label: 'Claude Haiku 3.5',  provider: 'Anthropic', kind: 'chat', contextTokens: 200000 },
  { id: 'gemini-2-flash',    label: 'Gemini 2.0 Flash',  provider: 'Google',    kind: 'chat', contextTokens: 1000000 },
  { id: 'gemini-1-5-pro',    label: 'Gemini 1.5 Pro',    provider: 'Google',    kind: 'chat', contextTokens: 2000000 },
  { id: 'llama-3-3-70b',     label: 'Llama 3.3 70B',     provider: 'Meta',      kind: 'chat', contextTokens: 128000 },
  { id: 'mistral-large',     label: 'Mistral Large',     provider: 'Mistral',   kind: 'chat', contextTokens: 128000 },
];

// ─── Analysis ───────────────────────────────────────────────────────────────

export function analyzePrompt(text: string, modelId = 'gpt-4o'): PromptAnalysis {
  const w = words(text);
  const sents = sentences(text);
  const lower = text.toLowerCase();
  const sections = extractSections(text);
  const parameters = extractParameters(text);
  const estTokens = Math.ceil(text.length / 4);
  const lines = text.split('\n').filter((l) => l.trim()).length;
  const model = MODEL_PROFILES.find((m) => m.id === modelId) ?? MODEL_PROFILES[0];

  const metrics: MetricResult[] = [];
  const empty = w.length === 0;

  // ── Clarity ──────────────────────────────────────────────────────────────
  {
    const avgLen = sents.length ? w.length / sents.length : 0;
    const long = sents.filter((s) => words(s).length > 40);
    const vague = VAGUE.filter((v) => new RegExp(`\\b${v}\\b`, 'i').test(lower));
    const hasVerb = IMPERATIVE.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(lower));
    let score = 100;
    const evidence: string[] = [];
    const advice: string[] = [];
    if (!hasVerb) { score -= 25; evidence.push('No direct instruction verb found (write, analyse, list…).'); advice.push('Open with a direct instruction that states the task.'); }
    else evidence.push('States the task with a direct instruction verb.');
    if (avgLen > 28) { score -= 15; evidence.push(`Average sentence length is ${avgLen.toFixed(0)} words.`); advice.push('Split long sentences so each carries one instruction.'); }
    else if (sents.length) evidence.push(`Average sentence length is ${avgLen.toFixed(0)} words.`);
    if (long.length) { score -= Math.min(20, long.length * 7); evidence.push(`${long.length} sentence(s) longer than 40 words.`); }
    if (vague.length) { score -= Math.min(30, vague.length * 8); evidence.push(`Vague wording: ${vague.slice(0, 6).map((v) => `"${v}"`).join(', ')}.`); advice.push('Replace vague words with the concrete thing you mean.'); }
    if (w.length > 0 && w.length < 8) { score -= 25; evidence.push(`Only ${w.length} words — little room to be unambiguous.`); }
    metrics.push({ id: 'clarity', label: METRIC_LABELS.clarity, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : vague.length || long.length || !hasVerb ? 'Some wording can be read more than one way.' : 'Instructions read directly and unambiguously.', evidence, advice });
  }

  // ── Completeness ─────────────────────────────────────────────────────────
  {
    const parts: [string, boolean, string][] = [
      ['task / objective', IMPERATIVE.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(lower)), 'State what the model must produce.'],
      ['role', ROLE_RE.test(text), 'Give the model a role or area of expertise.'],
      ['context', CONTEXT_RE.test(text), 'Add the background the model cannot infer.'],
      ['output format', FORMAT_RE.test(text), 'Describe the shape of the answer you expect.'],
      ['constraints', (text.match(CONSTRAINT_RE) ?? []).length > 0, 'Say what to avoid and where the limits are.'],
      ['quality criteria', QUALITY_RE.test(text), 'Say how a good answer will be recognised.'],
    ];
    const present = parts.filter((p) => p[1]);
    const missing = parts.filter((p) => !p[1]);
    metrics.push({
      id: 'completeness', label: METRIC_LABELS.completeness,
      score: empty ? 0 : clamp((present.length / parts.length) * 100),
      summary: empty ? 'No text to evaluate.' : `${present.length} of ${parts.length} core components detected.`,
      evidence: [
        present.length ? `Present: ${present.map((p) => p[0]).join(', ')}.` : 'No core components detected.',
        ...(missing.length ? [`Not detected: ${missing.map((p) => p[0]).join(', ')}.`] : []),
      ],
      advice: missing.map((p) => p[2]),
    });
  }

  // ── Specificity ──────────────────────────────────────────────────────────
  {
    const numbers = text.match(/\b\d+(?:[.,]\d+)?\s?(?:%|words?|palavras?|tokens?|items?|itens|lines?|linhas?|sentences?|frases?|paragraphs?|parágrafos?|px|s|min|chars?|caracteres)?\b/gi) ?? [];
    const quoted = text.match(/"[^"\n]{2,}"|`[^`\n]{2,}`/g) ?? [];
    const hasExample = EXAMPLE_RE.test(text);
    const proper = text.match(/(?<![.!?]\s)(?<!^)\b[A-Z][a-z]{2,}\b/gm) ?? [];
    let score = 20;
    const evidence: string[] = [];
    const advice: string[] = [];
    if (numbers.length) { score += Math.min(30, numbers.length * 10); evidence.push(`${numbers.length} concrete quantity/quantities (${numbers.slice(0, 4).join(', ')}).`); }
    else advice.push('Quantify where you can: length, count, range.');
    if (quoted.length) { score += Math.min(15, quoted.length * 8); evidence.push(`${quoted.length} quoted literal(s).`); }
    if (hasExample) { score += 20; evidence.push('Includes an example or sample.'); }
    else advice.push('Add one short example of the result you want.');
    if (proper.length >= 2) { score += 10; evidence.push('Names specific entities.'); }
    if (w.length >= 40) score += 10;
    if (w.length < 12) { score -= 15; evidence.push('Very short — few details to anchor the answer.'); }
    metrics.push({ id: 'specificity', label: METRIC_LABELS.specificity, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : score >= 60 ? 'Anchored with concrete details.' : 'Mostly general statements; few concrete anchors.', evidence, advice });
  }

  // ── Consistency ──────────────────────────────────────────────────────────
  {
    const contradictions = findContradictions(text);
    const dups = findDuplicateLines(text);
    let score = 100 - contradictions.length * 30 - Math.min(30, dups.length * 10);
    const evidence: string[] = [];
    if (contradictions.length) evidence.push(...contradictions.map((c) => `Possible conflict: ${c}.`));
    if (dups.length) evidence.push(...dups.slice(0, 3).map((d) => `Repeated line: "${d.length > 70 ? d.slice(0, 70) + '…' : d}"`));
    if (!evidence.length) evidence.push('No conflicting or repeated instructions detected by the pattern checks.');
    if (empty) score = 0;
    metrics.push({
      id: 'consistency', label: METRIC_LABELS.consistency, score: clamp(score),
      summary: empty ? 'No text to evaluate.' : contradictions.length ? 'Some instructions appear to pull in opposite directions.' : dups.length ? 'Some instructions are repeated.' : 'No conflicts found by the pattern checks.',
      evidence,
      advice: [
        ...(contradictions.length ? ['Decide which instruction wins, or state when each applies.'] : []),
        ...(dups.length ? ['Remove repeated lines so each rule appears once.'] : []),
      ],
    });
  }

  // ── Structure ────────────────────────────────────────────────────────────
  {
    const bullets = (text.match(/^\s*(?:[-*•]|\d+[.)])\s+/gm) ?? []).length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
    let score = 25;
    const evidence: string[] = [];
    const advice: string[] = [];
    if (sections.length >= 3) { score += 45; evidence.push(`${sections.length} labelled sections (${sections.slice(0, 5).join(', ')}${sections.length > 5 ? '…' : ''}).`); }
    else if (sections.length > 0) { score += 25; evidence.push(`${sections.length} labelled section(s).`); advice.push('Label each part (Role, Context, Instructions, Output Format).'); }
    else { evidence.push('No labelled sections.'); if (w.length > 60) advice.push('Break the prompt into labelled sections.'); }
    if (bullets >= 2) { score += 20; evidence.push(`${bullets} list items.`); }
    else if (w.length > 60) advice.push('Use a numbered list for steps that happen in order.');
    if (paragraphs >= 2) { score += 10; evidence.push(`${paragraphs} paragraphs.`); }
    if (w.length <= 40 && sections.length === 0) { score = Math.max(score, 55); evidence.push('Short prompt — heavy structure is not required.'); }
    metrics.push({ id: 'structure', label: METRIC_LABELS.structure, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : score >= 65 ? 'Organised into parts that can be scanned.' : 'Reads as one block of text.', evidence, advice });
  }

  // ── Context Quality ──────────────────────────────────────────────────────
  {
    const hasContext = CONTEXT_RE.test(text);
    const hasAudience = /\b(audience|reader|user|customer|client|student|público|leitor|utilizador|cliente|aluno)\b/i.test(text);
    const hasPurpose = /\b(in order to|so that|goal|purpose|because|para que|de modo a|objetivo|finalidade|porque)\b/i.test(text);
    const hasRole = ROLE_RE.test(text);
    let score = 10;
    const evidence: string[] = [];
    const advice: string[] = [];
    if (hasContext) { score += 30; evidence.push('Provides background or situation.'); } else advice.push('Describe the situation the task belongs to.');
    if (hasAudience) { score += 25; evidence.push('Names who the result is for.'); } else advice.push('Say who will read or use the result.');
    if (hasPurpose) { score += 20; evidence.push('Explains the purpose behind the task.'); } else advice.push('Say why the task matters — it guides trade-offs.');
    if (hasRole) { score += 15; evidence.push('Assigns a role.'); }
    if (!evidence.length) evidence.push('No background, audience or purpose detected.');
    metrics.push({ id: 'context', label: METRIC_LABELS.context, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : score >= 60 ? 'The model is told where the task sits.' : 'The model would have to guess the surrounding situation.', evidence, advice });
  }

  // ── Constraint Quality ───────────────────────────────────────────────────
  {
    const found = text.match(CONSTRAINT_RE) ?? [];
    const measurable = text.match(/\b(at most|at least|no more than|no fewer than|maximum|minimum|under|up to|no máximo|no mínimo|máximo|mínimo|até)\s+\d+/gi) ?? [];
    let score = 15;
    const evidence: string[] = [];
    const advice: string[] = [];
    if (found.length) { score += Math.min(45, found.length * 12); evidence.push(`${found.length} limiting phrase(s) (${[...new Set(found.map((f) => f.toLowerCase()))].slice(0, 5).join(', ')}).`); }
    else { evidence.push('No explicit limits or exclusions.'); advice.push('State what must not appear and where the boundaries are.'); }
    if (measurable.length) { score += 30; evidence.push(`${measurable.length} measurable limit(s) (${measurable.slice(0, 3).join(', ')}).`); }
    else advice.push('Make at least one limit measurable (e.g. "at most 200 words").');
    if (found.length > 12) { score -= 15; evidence.push('Many prohibitions — the core task may get buried.'); }
    metrics.push({ id: 'constraints', label: METRIC_LABELS.constraints, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : measurable.length ? 'Limits are stated and at least one is measurable.' : found.length ? 'Limits are stated but not measurable.' : 'No limits stated.', evidence, advice });
  }

  // ── Model Compatibility ──────────────────────────────────────────────────
  {
    let score = 100;
    const evidence: string[] = [`Evaluated for ${model.label} (${model.provider}).`];
    const advice: string[] = [];
    const share = estTokens / model.contextTokens;
    evidence.push(`≈${estTokens.toLocaleString()} tokens (4 chars/token estimate) — ${(share * 100).toFixed(share < 0.01 ? 2 : 1)}% of the documented context window.`);
    if (share > 0.5) { score -= 40; advice.push('The prompt uses most of the context window; trim reference material.'); }
    if (model.kind === 'chat' && /--(ar|v|stylize|chaos|seed)\b/.test(text)) { score -= 25; evidence.push('Contains image-generator flags (--ar, --v…) that chat models ignore.'); advice.push('Remove image-generator flags or target an image model.'); }
    if (model.provider === 'Anthropic' && sections.length >= 3 && !/<[a-z_]+>/i.test(text)) { evidence.push('Anthropic documents XML tags as a reliable way to delimit sections.'); advice.push('Optionally wrap long sections in XML tags.'); score -= 5; }
    if (/\bjson\b/i.test(text) && !/\b(schema|keys?|fields?|chaves?|campos?)\b/i.test(text)) { score -= 10; evidence.push('Requests JSON without naming the keys.'); advice.push('List the JSON keys and their types.'); }
    metrics.push({ id: 'compatibility', label: METRIC_LABELS.compatibility, score: empty ? 0 : clamp(score), summary: empty ? 'No text to evaluate.' : score >= 85 ? 'Nothing in the text conflicts with the target model.' : 'Some elements do not fit the target model well.', evidence, advice });
  }

  const overall = empty ? 0 : clamp(metrics.reduce((s, m) => s + m.score, 0) / metrics.length);
  return { metrics, overall, words: w.length, chars: text.length, lines, estTokens, sections, parameters };
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success)';
  if (score >= 55) return 'var(--secondary)';
  if (score >= 35) return 'var(--warning)';
  return 'var(--destructive)';
}

// ─── Diff ───────────────────────────────────────────────────────────────────

export interface DiffPart { type: 'same' | 'add' | 'del'; text: string }

function lcsDiff(a: string[], b: string[]): DiffPart[] {
  const n = a.length, m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text; else out.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { push('same', a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push('del', a[i]); i++; }
    else { push('add', b[j]); j++; }
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('add', b[j++]);
  return out;
}

/** Word-level diff that preserves whitespace and line breaks. */
export function diffWords(a: string, b: string): DiffPart[] {
  // Each token is a word plus the whitespace after it, so words align cleanly.
  const tok = (s: string) => s.match(/^\s+|\S+\s*/g) ?? [];
  const ta = tok(a), tb = tok(b);
  // Guard against quadratic blow-up on very large inputs: fall back to lines.
  if (ta.length * tb.length > 4_000_000) {
    const la = a.split(/(?<=\n)/), lb = b.split(/(?<=\n)/);
    return lcsDiff(la, lb);
  }
  return lcsDiff(ta, tb);
}

export interface DiffStats { added: number; removed: number }

export function diffStats(parts: DiffPart[]): DiffStats {
  let added = 0, removed = 0;
  for (const p of parts) {
    const c = words(p.text).length;
    if (p.type === 'add') added += c;
    if (p.type === 'del') removed += c;
  }
  return { added, removed };
}

export interface StructuralChange { kind: 'added' | 'removed'; section: string }

export function structuralChanges(a: string, b: string): StructuralChange[] {
  const sa = extractSections(a).map((s) => s.toLowerCase());
  const sb = extractSections(b).map((s) => s.toLowerCase());
  const out: StructuralChange[] = [];
  for (const s of sb) if (!sa.includes(s)) out.push({ kind: 'added', section: s });
  for (const s of sa) if (!sb.includes(s)) out.push({ kind: 'removed', section: s });
  return out;
}

export interface ParameterChange { key: string; from?: string; to?: string }

export function parameterChanges(a: string, b: string): ParameterChange[] {
  const pa = extractParameters(a), pb = extractParameters(b);
  const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  const out: ParameterChange[] = [];
  for (const k of keys) if (pa[k] !== pb[k]) out.push({ key: k, from: pa[k], to: pb[k] });
  return out;
}
