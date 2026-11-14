// ─── Prompt Canvas — data model, compilation and analysis ───────────────────
import type { Node, Edge } from '@xyflow/react';
import {
  Target, User, BookOpen, FileCheck, List, Palette, Ban, SlidersHorizontal,
  Quote, Link2, FileOutput, Star, ShieldCheck, Cpu, Flag,
} from 'lucide-react';
import { findContradictions, words, MODEL_PROFILES } from '../../../lib/promptAnalysis';

export type BlockKind =
  | 'objective' | 'role' | 'context' | 'requirements' | 'instructions' | 'style'
  | 'constraints' | 'parameters' | 'examples' | 'references' | 'outputFormat'
  | 'quality' | 'validation' | 'modelTarget' | 'result';

export interface BlockDef {
  kind: BlockKind;
  label: string;
  icon: React.ElementType;
  color: string;
  placeholder: string;
}

/** Canonical order — also the order sections take in the compiled prompt. */
export const BLOCKS: BlockDef[] = [
  { kind: 'role',         label: 'Role',             icon: User,              color: '#8067FF', placeholder: 'You are an expert in…' },
  { kind: 'objective',    label: 'Objective',        icon: Target,            color: '#27D7E5', placeholder: 'What should the AI accomplish?' },
  { kind: 'context',      label: 'Context',          icon: BookOpen,          color: '#5AA9FF', placeholder: 'Background, audience, situation…' },
  { kind: 'instructions', label: 'Instructions',     icon: List,              color: '#8067FF', placeholder: 'Step-by-step instructions…' },
  { kind: 'requirements', label: 'Requirements',     icon: FileCheck,         color: '#45D6A0', placeholder: 'The output must include…' },
  { kind: 'constraints',  label: 'Constraints',      icon: Ban,               color: '#FF667C', placeholder: 'Do not… avoid… never…' },
  { kind: 'style',        label: 'Style',            icon: Palette,           color: '#E58CFF', placeholder: 'Tone, voice, register…' },
  { kind: 'parameters',   label: 'Parameters',       icon: SlidersHorizontal, color: '#FFBF69', placeholder: 'Temperature: 0.7\nMax tokens: 2000' },
  { kind: 'examples',     label: 'Examples',         icon: Quote,             color: '#5AA9FF', placeholder: 'Input: …\nOutput: …' },
  { kind: 'references',   label: 'References',       icon: Link2,             color: '#8791A5', placeholder: 'Source material, links, documents…' },
  { kind: 'outputFormat', label: 'Output Format',    icon: FileOutput,        color: '#27D7E5', placeholder: 'Return a JSON object with keys…' },
  { kind: 'quality',      label: 'Quality Criteria', icon: Star,              color: '#FFBF69', placeholder: 'A good answer…' },
  { kind: 'validation',   label: 'Validation',       icon: ShieldCheck,       color: '#45D6A0', placeholder: 'Before answering, check that…' },
  { kind: 'modelTarget',  label: 'Model Target',     icon: Cpu,               color: '#C3CAD8', placeholder: '' },
  { kind: 'result',       label: 'Result',           icon: Flag,              color: '#45D6A0', placeholder: '' },
];

export const BLOCK_BY_KIND = Object.fromEntries(BLOCKS.map((b) => [b.kind, b])) as Record<BlockKind, BlockDef>;
const ORDER = Object.fromEntries(BLOCKS.map((b, i) => [b.kind, i])) as Record<BlockKind, number>;
const NON_TEXT: BlockKind[] = ['modelTarget', 'result'];

export type BlockNode = Node<{ kind: BlockKind; content: string }, 'block'>;
export type GroupNode = Node<{ label: string }, 'forgeGroup'>;
export type CanvasNode = BlockNode | GroupNode;

export const isBlock = (n: CanvasNode): n is BlockNode => n.type === 'block';

export const NODE_W = 264;

let seq = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function makeBlock(kind: BlockKind, position: { x: number; y: number }, content = ''): BlockNode {
  return {
    id: newId(kind),
    type: 'block',
    position,
    data: { kind, content: kind === 'modelTarget' && !content ? 'gpt-4o' : content },
  };
}

export function starterGraph(): { nodes: CanvasNode[]; edges: Edge[] } {
  const kinds: BlockKind[] = ['role', 'objective', 'context', 'instructions', 'outputFormat'];
  const nodes: CanvasNode[] = kinds.map((k, i) => makeBlock(k, { x: 40 + (i % 2) * 320, y: 40 + Math.floor(i / 2) * 210 + (i % 2) * 40 }));
  const result = makeBlock('result', { x: 760, y: 200 });
  const edges: Edge[] = nodes.map((n) => ({ id: newId('e'), source: n.id, target: result.id }));
  return { nodes: [...nodes, result], edges };
}

function absPos(n: CanvasNode, all: CanvasNode[]) {
  const parent = n.parentId ? all.find((p) => p.id === n.parentId) : undefined;
  return parent ? { x: n.position.x + parent.position.x, y: n.position.y + parent.position.y } : n.position;
}

/** Blocks that feed the Result block (transitively). Null when nothing is wired. */
function wiredToResult(nodes: CanvasNode[], edges: Edge[]): Set<string> | null {
  const results = nodes.filter((n) => isBlock(n) && n.data.kind === 'result');
  if (!results.length) return null;
  const reached = new Set<string>();
  const stack = results.map((r) => r.id);
  while (stack.length) {
    const id = stack.pop()!;
    for (const e of edges) {
      if (e.target === id && !reached.has(e.source)) { reached.add(e.source); stack.push(e.source); }
    }
  }
  return reached.size ? reached : null;
}

/** Text blocks in the order they appear in the compiled prompt. */
export function orderedTextBlocks(nodes: CanvasNode[], edges: Edge[]): BlockNode[] {
  const wired = wiredToResult(nodes, edges);
  return nodes
    .filter(isBlock)
    .filter((n) => !NON_TEXT.includes(n.data.kind))
    .filter((n) => !wired || wired.has(n.id))
    .sort((a, b) => {
      const d = ORDER[a.data.kind] - ORDER[b.data.kind];
      if (d) return d;
      const pa = absPos(a, nodes), pb = absPos(b, nodes);
      return pa.y - pb.y || pa.x - pb.x;
    });
}

export function compilePrompt(nodes: CanvasNode[], edges: Edge[]): string {
  return orderedTextBlocks(nodes, edges)
    .filter((n) => n.data.content.trim())
    .map((n) => `## ${BLOCK_BY_KIND[n.data.kind].label}\n${n.data.content.trim()}`)
    .join('\n\n');
}

export function targetModel(nodes: CanvasNode[]): string {
  const t = nodes.find((n) => isBlock(n) && n.data.kind === 'modelTarget') as BlockNode | undefined;
  return t?.data.content || 'gpt-4o';
}

// ─── Text → blocks ──────────────────────────────────────────────────────────

const LABEL_TO_KIND = new Map<string, BlockKind>(
  BLOCKS.filter((b) => !NON_TEXT.includes(b.kind)).map((b) => [b.label.toLowerCase(), b.kind]),
);

export function parsePromptText(text: string): { kind: BlockKind; content: string }[] {
  const out: { kind: BlockKind; content: string }[] = [];
  let current: { kind: BlockKind; lines: string[] } = { kind: 'objective', lines: [] };
  let sawHeading = false;
  const flush = () => {
    const content = current.lines.join('\n').trim();
    if (content || sawHeading) out.push({ kind: current.kind, content });
  };
  for (const line of text.split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    const kind = m ? LABEL_TO_KIND.get(m[1].toLowerCase()) : undefined;
    if (kind) {
      flush();
      sawHeading = true;
      current = { kind, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();
  // A leading chunk with no heading and no content is noise.
  return out.filter((s, i) => !(i === 0 && !s.content && out.length > 1));
}

/** Apply edited text back onto the graph: update matching blocks, add new ones. */
export function applyTextToGraph(text: string, nodes: CanvasNode[], edges: Edge[]): { nodes: CanvasNode[]; edges: Edge[] } {
  const sections = parsePromptText(text);
  const existing = orderedTextBlocks(nodes, edges);
  const byKind = new Map<BlockKind, BlockNode[]>();
  for (const n of existing) byKind.set(n.data.kind, [...(byKind.get(n.data.kind) ?? []), n]);

  const updates = new Map<string, string>();
  const used = new Set<string>();
  const added: BlockNode[] = [];
  const rewire: string[] = [];
  const counter = new Map<BlockKind, number>();
  const result = nodes.find((n) => isBlock(n) && n.data.kind === 'result');
  const maxY = nodes.reduce((m, n) => Math.max(m, absPos(n, nodes).y), 0);

  for (const s of sections) {
    const idx = counter.get(s.kind) ?? 0;
    counter.set(s.kind, idx + 1);
    const match = byKind.get(s.kind)?.[idx];
    if (match) { updates.set(match.id, s.content); used.add(match.id); continue; }
    if (!s.content) continue;
    // Prefer an empty block of this kind that is sitting unconnected on the canvas.
    const spare = nodes.find((n): n is BlockNode => isBlock(n) && n.data.kind === s.kind && !n.data.content.trim() && !used.has(n.id) && !existing.includes(n));
    if (spare) { updates.set(spare.id, s.content); used.add(spare.id); rewire.push(spare.id); }
    else added.push(makeBlock(s.kind, { x: 40 + added.length * 300, y: maxY + 240 }, s.content));
  }
  // Sections removed from the text leave their block empty rather than deleting it.
  for (const n of existing) if (!used.has(n.id)) updates.set(n.id, '');

  const nextNodes = nodes.map((n) =>
    isBlock(n) && updates.has(n.id) && updates.get(n.id) !== n.data.content
      ? { ...n, data: { ...n.data, content: updates.get(n.id)! } }
      : n,
  );
  const toWire = [...rewire.filter((id) => !edges.some((e) => e.source === id)), ...added.map((a) => a.id)];
  const nextEdges = result ? [...edges, ...toWire.map((id) => ({ id: newId('e'), source: id, target: result.id }))] : edges;
  return { nodes: [...nextNodes, ...added], edges: nextEdges };
}

// ─── Intelligence (§11.4) ───────────────────────────────────────────────────

export type IssueKind = 'incomplete' | 'contradiction' | 'dependency' | 'duplicate' | 'context' | 'format';

export interface CanvasIssue {
  id: string;
  kind: IssueKind;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  nodeIds: string[];
}

export const ISSUE_LABEL: Record<IssueKind, string> = {
  incomplete: 'Incomplete block',
  contradiction: 'Contradictory instructions',
  dependency: 'Missing dependency',
  duplicate: 'Duplicate requirement',
  context: 'Insufficient context',
  format: 'Incompatible format',
};

const norm = (l: string) => l.toLowerCase().replace(/^[\s\-*•\d.)]+/, '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

export function analyzeGraph(nodes: CanvasNode[], edges: Edge[]): CanvasIssue[] {
  const issues: CanvasIssue[] = [];
  const blocks = nodes.filter(isBlock);
  const text = blocks.filter((b) => !NON_TEXT.includes(b.data.kind));
  const has = (k: BlockKind) => blocks.some((b) => b.data.kind === k);
  const filled = (k: BlockKind) => text.filter((b) => b.data.kind === k && b.data.content.trim());
  const label = (b: BlockNode) => BLOCK_BY_KIND[b.data.kind].label;

  // Incomplete blocks
  for (const b of text) {
    if (!b.data.content.trim()) {
      issues.push({ id: `inc-${b.id}`, kind: 'incomplete', severity: 'warning', title: `${label(b)} is empty`, detail: 'Empty blocks are left out of the compiled prompt.', nodeIds: [b.id] });
    }
  }

  // Missing dependencies
  if (!filled('objective').length && !filled('instructions').length) {
    issues.push({ id: 'dep-task', kind: 'dependency', severity: 'error', title: 'No task defined', detail: 'Add an Objective or Instructions block — without one the model has nothing to do.', nodeIds: [] });
  }
  const results = blocks.filter((b) => b.data.kind === 'result');
  if (!results.length) {
    issues.push({ id: 'dep-result', kind: 'dependency', severity: 'info', title: 'No Result block', detail: 'All blocks are compiled. Add a Result block to choose which ones feed the prompt.', nodeIds: [] });
  } else {
    const anyWired = edges.some((e) => results.some((r) => r.id === e.target));
    if (!anyWired) {
      issues.push({ id: 'dep-result-empty', kind: 'dependency', severity: 'warning', title: 'Result has no inputs', detail: 'Nothing is connected to Result, so every block is compiled.', nodeIds: results.map((r) => r.id) });
    } else {
      const included = new Set(orderedTextBlocks(nodes, edges).map((n) => n.id));
      const orphan = text.filter((b) => !included.has(b.id) && b.data.content.trim());
      if (orphan.length) {
        issues.push({ id: 'dep-orphan', kind: 'dependency', severity: 'warning', title: `${orphan.length} block(s) not connected to Result`, detail: `${orphan.map(label).join(', ')} — their content is not part of the compiled prompt.`, nodeIds: orphan.map((b) => b.id) });
      }
    }
  }
  if (filled('examples').length && !filled('outputFormat').length) {
    issues.push({ id: 'dep-format', kind: 'dependency', severity: 'info', title: 'Examples without Output Format', detail: 'Examples imply a shape. State it in an Output Format block so the model does not have to infer it.', nodeIds: filled('examples').map((b) => b.id) });
  }
  if (filled('validation').length && !filled('requirements').length && !filled('quality').length) {
    issues.push({ id: 'dep-validation', kind: 'dependency', severity: 'info', title: 'Validation without criteria', detail: 'Validation needs Requirements or Quality Criteria to check against.', nodeIds: filled('validation').map((b) => b.id) });
  }

  // Contradictions (pattern checks over the whole compiled text)
  const compiled = compilePrompt(nodes, edges);
  for (const c of findContradictions(compiled)) {
    issues.push({ id: `con-${c}`, kind: 'contradiction', severity: 'error', title: 'Instructions may conflict', detail: `The prompt ${c}. Decide which applies, or say when each does.`, nodeIds: [] });
  }

  // Duplicate requirements across blocks
  const seen = new Map<string, { raw: string; ids: Set<string> }>();
  for (const b of text) {
    for (const raw of b.data.content.split('\n')) {
      const n = norm(raw);
      if (words(n).length < 3) continue;
      const entry = seen.get(n) ?? { raw: raw.trim(), ids: new Set<string>() };
      if (entry.ids.has(b.id)) entry.ids.add(`${b.id}#dup`);
      entry.ids.add(b.id);
      seen.set(n, entry);
    }
  }
  for (const [n, entry] of seen) {
    if (entry.ids.size > 1) {
      issues.push({ id: `dup-${n}`, kind: 'duplicate', severity: 'warning', title: 'Same line appears more than once', detail: `"${entry.raw.length > 80 ? entry.raw.slice(0, 80) + '…' : entry.raw}"`, nodeIds: [...entry.ids].filter((i) => !i.endsWith('#dup')) });
    }
  }

  // Insufficient context
  const ctx = filled('context');
  if (!has('context') || !ctx.length) {
    if (filled('objective').length || filled('instructions').length) {
      issues.push({ id: 'ctx-none', kind: 'context', severity: 'warning', title: 'No context provided', detail: 'The model will not know the audience, situation or purpose unless you say so.', nodeIds: text.filter((b) => b.data.kind === 'context').map((b) => b.id) });
    }
  } else {
    const total = ctx.reduce((s, b) => s + words(b.data.content).length, 0);
    if (total < 12) {
      issues.push({ id: 'ctx-thin', kind: 'context', severity: 'info', title: 'Context is very short', detail: `${total} word(s). Consider adding who the result is for and why it is needed.`, nodeIds: ctx.map((b) => b.id) });
    }
  }

  // Incompatible formats
  const fmt = filled('outputFormat');
  const fmtText = fmt.map((b) => b.data.content).join('\n');
  if (fmtText) {
    const families: [string, RegExp][] = [
      ['JSON', /\bjson\b/i], ['Markdown', /\bmarkdown\b/i], ['XML', /\bxml\b/i], ['CSV', /\bcsv\b/i], ['YAML', /\byaml\b/i], ['plain prose', /\b(plain text|prose|paragraphs? only|texto simples|prosa)\b/i],
    ];
    const hit = families.filter(([, re]) => re.test(fmtText)).map(([n]) => n);
    if (hit.length > 1) {
      issues.push({ id: 'fmt-multi', kind: 'format', severity: 'warning', title: 'More than one output format requested', detail: `${hit.join(' and ')} are both mentioned. State which wraps which, or pick one.`, nodeIds: fmt.map((b) => b.id) });
    }
    if (/\bjson\b/i.test(fmtText) && /\b(only|apenas|exclusively)\b/i.test(fmtText)) {
      const styleText = filled('style').map((b) => b.data.content).join('\n');
      if (/\b(conversational|friendly|storytelling|narrative|conversacional|narrativo)\b/i.test(styleText)) {
        issues.push({ id: 'fmt-style', kind: 'format', severity: 'warning', title: 'Style does not fit JSON-only output', detail: 'A conversational or narrative style has no place to appear in a JSON-only answer.', nodeIds: [...fmt, ...filled('style')].map((b) => b.id) });
      }
    }
  }
  const model = MODEL_PROFILES.find((m) => m.id === targetModel(nodes));
  if (model?.kind === 'chat' && /--(ar|v|stylize|chaos)\b/.test(compiled)) {
    issues.push({ id: 'fmt-flags', kind: 'format', severity: 'warning', title: 'Image-generator flags for a chat model', detail: `Flags such as --ar or --v are ignored by ${model.label}.`, nodeIds: [] });
  }

  const rank = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ─── Persistence ────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'forge.canvas.v1';

export interface CanvasFile { app: 'prompt-forge-canvas'; version: 1; nodes: CanvasNode[]; edges: Edge[] }

const KINDS = new Set(BLOCKS.map((b) => b.kind));

/** Validate untrusted JSON (localStorage or an imported file) into a graph. */
export function parseCanvasFile(raw: unknown): { nodes: CanvasNode[]; edges: Edge[] } | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Partial<CanvasFile>;
  if (!Array.isArray(f.nodes) || !Array.isArray(f.edges)) return null;
  const nodes: CanvasNode[] = [];
  for (const n of f.nodes as unknown[]) {
    if (!n || typeof n !== 'object') return null;
    const o = n as Record<string, unknown>;
    const pos = o.position as { x?: unknown; y?: unknown } | undefined;
    if (typeof o.id !== 'string' || !pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return null;
    const data = (o.data ?? {}) as Record<string, unknown>;
    const base = { id: o.id, position: { x: pos.x, y: pos.y }, ...(typeof o.parentId === 'string' ? { parentId: o.parentId } : {}) };
    if (o.type === 'block' && typeof data.kind === 'string' && KINDS.has(data.kind as BlockKind)) {
      nodes.push({ ...base, type: 'block', data: { kind: data.kind as BlockKind, content: String(data.content ?? '') } });
    } else if (o.type === 'forgeGroup') {
      const style = (o.style ?? {}) as { width?: unknown; height?: unknown };
      nodes.push({ ...base, type: 'forgeGroup', data: { label: String(data.label ?? 'Group') }, style: { width: Number(style.width) || 320, height: Number(style.height) || 240 } });
    } else return null;
  }
  const ids = new Set(nodes.map((n) => n.id));
  // Parents must come before their children, and must exist.
  const sorted = [...nodes.filter((n) => n.type === 'forgeGroup'), ...nodes.filter((n) => n.type !== 'forgeGroup')]
    .map((n) => (n.parentId && !ids.has(n.parentId) ? { ...n, parentId: undefined } : n)) as CanvasNode[];
  const edges: Edge[] = [];
  for (const e of f.edges as unknown[]) {
    const o = e as Record<string, unknown>;
    if (o && typeof o.source === 'string' && typeof o.target === 'string' && ids.has(o.source) && ids.has(o.target)) {
      edges.push({ id: typeof o.id === 'string' ? o.id : newId('e'), source: o.source, target: o.target });
    }
  }
  return { nodes: sorted, edges };
}

export function serializeCanvas(nodes: CanvasNode[], edges: Edge[]): CanvasFile {
  return {
    app: 'prompt-forge-canvas',
    version: 1,
    nodes: nodes.map((n) => ({
      id: n.id, type: n.type, position: n.position, data: n.data,
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.type === 'forgeGroup' ? { style: { width: n.style?.width, height: n.style?.height } } : {}),
    })) as CanvasNode[],
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}
