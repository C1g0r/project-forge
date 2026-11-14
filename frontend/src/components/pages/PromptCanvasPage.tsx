import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap,
  Handle, Position, addEdge, useEdgesState, useNodesState, useReactFlow, SelectionMode,
  type Connection, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Undo2, Redo2, Copy, Trash2, Group, Ungroup, Upload, Download, FileText,
  AlertTriangle, AlertCircle, Info, CheckCircle2, FlaskConical, Check, Unlink,
  LayoutGrid, Type, Columns2, Eraser,
} from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { MODEL_PROFILES, words } from '../../lib/promptAnalysis';
import {
  BLOCKS, BLOCK_BY_KIND, NODE_W, STORAGE_KEY, ISSUE_LABEL,
  analyzeGraph, applyTextToGraph, compilePrompt, isBlock, makeBlock, newId,
  parseCanvasFile, serializeCanvas, starterGraph,
  type BlockKind, type BlockNode, type CanvasIssue, type CanvasNode, type GroupNode,
} from './canvas/canvasModel';

type CanvasMode = 'visual' | 'editor' | 'hybrid';

// ─── Context shared with node components ────────────────────────────────────

interface Ctx {
  compiled: string;
  snapshot: () => void;
  flagged: Map<string, CanvasIssue['severity']>;
  openInLab: () => void;
}
const CanvasCtx = createContext<Ctx>({ compiled: '', snapshot: () => {}, flagged: new Map(), openInLab: () => {} });

const SEVERITY_COLOR = { error: 'var(--destructive)', warning: 'var(--warning)', info: 'var(--secondary)' } as const;

// ─── Nodes ──────────────────────────────────────────────────────────────────

const handleStyle: React.CSSProperties = {
  width: 10, height: 10, background: 'var(--surface)', border: '2px solid var(--border-strong)',
};

function BlockNodeView({ id, data, selected }: NodeProps<BlockNode>) {
  const def = BLOCK_BY_KIND[data.kind];
  const Icon = def.icon;
  const { updateNodeData } = useReactFlow();
  const { compiled, snapshot, flagged, openInLab } = useContext(CanvasCtx);
  const [copied, setCopied] = useState(false);
  const flag = flagged.get(id);
  const lines = data.content.split('\n').length;
  const dirty = useRef(false);
  const edit = (content: string) => {
    if (!dirty.current) { snapshot(); dirty.current = true; }
    updateNodeData(id, { content });
  };

  return (
    <div
      style={{
        width: NODE_W,
        background: 'var(--surface)',
        border: `1px solid ${selected ? def.color : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: selected ? `0 0 0 1px ${def.color}, 0 8px 28px rgba(0,0,0,0.55)` : 'var(--shadow-md)',
        transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
      }}
    >
      {data.kind !== 'result' && <Handle type="source" position={Position.Right} style={handleStyle} />}
      {data.kind !== 'modelTarget' && <Handle type="target" position={Position.Left} style={handleStyle} />}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
          borderBottom: '1px solid var(--border)',
          background: `linear-gradient(90deg, ${def.color}1F, transparent 70%)`,
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      >
        <div style={{ width: 22, height: 22, borderRadius: 6, background: `${def.color}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color={def.color} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-display)', flex: 1 }}>{def.label}</span>
        {flag && <span title="Has an open issue" style={{ width: 7, height: 7, borderRadius: '50%', background: SEVERITY_COLOR[flag] }} />}
      </div>

      <div style={{ padding: 8 }}>
        {data.kind === 'modelTarget' ? (
          <select
            className="nodrag"
            value={data.content}
            onFocus={() => { dirty.current = false; }}
            onChange={(e) => edit(e.target.value)}
            style={{ width: '100%', background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 8px', fontSize: 12, outline: 'none' }}
          >
            {MODEL_PROFILES.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>)}
          </select>
        ) : data.kind === 'result' ? (
          <>
            <div
              className="nodrag nowheel"
              style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5, lineHeight: 1.55, color: compiled ? 'var(--foreground-secondary)' : 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', cursor: 'text' }}
            >
              {compiled || 'The compiled prompt appears here once connected blocks have content.'}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <NodeBtn disabled={!compiled} onClick={() => { navigator.clipboard?.writeText(compiled).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {}); }}>
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
              </NodeBtn>
              <NodeBtn disabled={!compiled} onClick={openInLab}><FlaskConical size={11} /> Analyse in Lab</NodeBtn>
            </div>
          </>
        ) : (
          <textarea
            className="nodrag nowheel"
            value={data.content}
            placeholder={def.placeholder}
            rows={Math.max(3, Math.min(9, lines))}
            onFocus={() => { dirty.current = false; }}
            onChange={(e) => edit(e.target.value)}
            style={{ width: '100%', resize: 'none', background: 'var(--background-secondary)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '7px 8px', fontSize: 12, lineHeight: 1.5, fontFamily: 'var(--font-sans)', outline: 'none', display: 'block', boxSizing: 'border-box' }}
          />
        )}
      </div>
    </div>
  );
}

function NodeBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className="nodrag"
      disabled={disabled}
      onClick={onClick}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px 6px', fontSize: 11, fontWeight: 500, color: disabled ? 'var(--muted)' : 'var(--foreground-secondary)', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1 }}
    >
      {children}
    </button>
  );
}

function GroupNodeView({ id, data, selected }: NodeProps<GroupNode>) {
  const { updateNodeData } = useReactFlow();
  const { snapshot } = useContext(CanvasCtx);
  const dirty = useRef(false);
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-xl)', border: `1px dashed ${selected ? 'var(--primary)' : 'var(--border-strong)'}`, background: 'rgba(128,103,255,0.05)' }}>
      <input
        className="nodrag"
        value={data.label}
        onFocus={() => { dirty.current = false; }}
        onChange={(e) => { if (!dirty.current) { snapshot(); dirty.current = true; } updateNodeData(id, { label: e.target.value }); }}
        aria-label="Group name"
        style={{ margin: 8, padding: '2px 6px', width: 160, background: 'transparent', border: '1px solid transparent', borderRadius: 4, color: 'var(--muted)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', outline: 'none' }}
      />
    </div>
  );
}

const nodeTypes = { block: BlockNodeView, forgeGroup: GroupNodeView };

// ─── Page ───────────────────────────────────────────────────────────────────

function loadInitial(): { nodes: CanvasNode[]; edges: Edge[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = parseCanvasFile(JSON.parse(raw));
      if (parsed && parsed.nodes.length) return parsed;
    }
  } catch { /* storage unavailable or corrupt — start fresh */ }
  return starterGraph();
}

function CanvasInner() {
  const { setView, setLabDraft } = usePromptStore();
  const initial = useMemo(loadInitial, []);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [mode, setMode] = useState<CanvasMode>('visual');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [histLen, setHistLen] = useState({ past: 0, future: 0 });
  const [draft, setDraft] = useState('');
  const textFocused = useRef(false);
  const textDirty = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const rf = useReactFlow<CanvasNode, Edge>();

  // Latest graph for callbacks that must not re-create on every keystroke.
  const live = useRef({ nodes, edges });
  live.current = { nodes, edges };

  // ── Undo / redo ───────────────────────────────────────────────────────────
  const past = useRef<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const future = useRef<{ nodes: CanvasNode[]; edges: Edge[] }[]>([]);
  const strip = (ns: CanvasNode[]) => ns.map((n) => ({ ...n, selected: false, dragging: false })) as CanvasNode[];

  const snapshot = useCallback(() => {
    past.current.push({ nodes: strip(live.current.nodes), edges: live.current.edges });
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setHistLen({ past: past.current.length, future: 0 });
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ nodes: strip(live.current.nodes), edges: live.current.edges });
    setNodes(prev.nodes); setEdges(prev.edges);
    setHistLen({ past: past.current.length, future: future.current.length });
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ nodes: strip(live.current.nodes), edges: live.current.edges });
    setNodes(next.nodes); setEdges(next.edges);
    setHistLen({ past: past.current.length, future: future.current.length });
  }, [setNodes, setEdges]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const compiled = useMemo(() => compilePrompt(nodes, edges), [nodes, edges]);
  const issues = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges]);
  const flagged = useMemo(() => {
    const rank = { error: 0, warning: 1, info: 2 };
    const m = new Map<string, CanvasIssue['severity']>();
    for (const i of issues) for (const id of i.nodeIds) {
      const cur = m.get(id);
      if (!cur || rank[i.severity] < rank[cur]) m.set(id, i.severity);
    }
    return m;
  }, [issues]);
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const selectedBlocks = selectedNodes.filter(isBlock);
  const selectedGroups = selectedNodes.filter((n) => n.type === 'forgeGroup');

  const flash = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setNotice({ text, tone });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), 2600);
  }, []);

  const openInLab = useCallback(() => {
    const text = compilePrompt(live.current.nodes, live.current.edges);
    if (!text) return;
    setLabDraft(text);
    setView('lab');
  }, [setLabDraft, setView]);

  // ── Autosave ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCanvas(nodes, edges)));
        setSavedAt(new Date()); setSaveFailed(false);
      } catch { setSaveFailed(true); }
    }, 500);
    return () => window.clearTimeout(t);
  }, [nodes, edges]);

  // ── Text ↔ blocks sync ────────────────────────────────────────────────────
  useEffect(() => { if (!textFocused.current) setDraft(compiled); }, [compiled]);

  const onDraftChange = (text: string) => {
    if (!textDirty.current) { snapshot(); textDirty.current = true; }
    setDraft(text);
    const next = applyTextToGraph(text, live.current.nodes, live.current.edges);
    setNodes(next.nodes); setEdges(next.edges);
  };

  // ── Graph operations ──────────────────────────────────────────────────────
  const addBlock = useCallback((kind: BlockKind, at?: { x: number; y: number }) => {
    snapshot();
    let pos = at;
    if (!pos) {
      const r = wrapper.current?.getBoundingClientRect();
      const c = r ? rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 200, y: 200 };
      const jitter = (live.current.nodes.length % 6) * 24;
      pos = { x: c.x - NODE_W / 2 + jitter, y: c.y - 80 + jitter };
    }
    const node = { ...makeBlock(kind, pos), selected: true };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })) as CanvasNode[], node]);
  }, [rf, setNodes, snapshot]);

  const onConnect = useCallback((c: Connection) => {
    if (c.source === c.target) return;
    snapshot();
    setEdges((es) => addEdge({ ...c, id: newId('e') }, es));
  }, [setEdges, snapshot]);

  const deleteSelection = useCallback(() => {
    const { nodes: ns, edges: es } = live.current;
    const ids = new Set(ns.filter((n) => n.selected).map((n) => n.id));
    const edgeIds = new Set(es.filter((e) => e.selected).map((e) => e.id));
    if (!ids.size && !edgeIds.size) return;
    snapshot();
    // Children of a deleted group go with it.
    for (const n of ns) if (n.parentId && ids.has(n.parentId)) ids.add(n.id);
    setNodes(ns.filter((n) => !ids.has(n.id)));
    setEdges(es.filter((e) => !edgeIds.has(e.id) && !ids.has(e.source) && !ids.has(e.target)));
  }, [setNodes, setEdges, snapshot]);

  const duplicateSelection = useCallback(() => {
    const sel = live.current.nodes.filter((n) => n.selected && isBlock(n)) as BlockNode[];
    if (!sel.length) return;
    snapshot();
    const idMap = new Map<string, string>();
    const copies = sel.map((n) => {
      const id = newId(n.data.kind);
      idMap.set(n.id, id);
      return { ...n, id, position: { x: n.position.x + 36, y: n.position.y + 36 }, data: { ...n.data }, selected: true } as BlockNode;
    });
    const edgeCopies = live.current.edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({ id: newId('e'), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })) as CanvasNode[], ...copies]);
    setEdges((es) => [...es, ...edgeCopies]);
  }, [setNodes, setEdges, snapshot]);

  const groupSelection = useCallback(() => {
    const all = live.current.nodes;
    const sel = all.filter((n) => n.selected && isBlock(n) && !n.parentId);
    if (sel.length < 2) return;
    snapshot();
    const pad = 28, top = 40;
    const box = sel.reduce((b, n) => {
      const w = n.measured?.width ?? NODE_W, h = n.measured?.height ?? 150;
      return { x1: Math.min(b.x1, n.position.x), y1: Math.min(b.y1, n.position.y), x2: Math.max(b.x2, n.position.x + w), y2: Math.max(b.y2, n.position.y + h) };
    }, { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity });
    const origin = { x: box.x1 - pad, y: box.y1 - pad - top };
    const group: GroupNode = {
      id: newId('group'), type: 'forgeGroup', position: origin, data: { label: 'Group' },
      style: { width: box.x2 - box.x1 + pad * 2, height: box.y2 - box.y1 + pad * 2 + top }, zIndex: -1,
    };
    const ids = new Set(sel.map((n) => n.id));
    const rest = all.filter((n) => !ids.has(n.id)).map((n) => ({ ...n, selected: false })) as CanvasNode[];
    const children = sel.map((n) => ({ ...n, parentId: group.id, selected: false, position: { x: n.position.x - origin.x, y: n.position.y - origin.y } })) as CanvasNode[];
    // A parent must precede its children in the node array.
    setNodes([...rest.filter((n) => n.type === 'forgeGroup'), group, ...rest.filter((n) => n.type !== 'forgeGroup'), ...children]);
  }, [setNodes, snapshot]);

  const ungroupSelection = useCallback(() => {
    const all = live.current.nodes;
    const groups = all.filter((n) => n.selected && n.type === 'forgeGroup');
    if (!groups.length) return;
    snapshot();
    const byId = new Map(groups.map((g) => [g.id, g]));
    setNodes(all.filter((n) => !byId.has(n.id)).map((n) => {
      const g = n.parentId ? byId.get(n.parentId) : undefined;
      return g ? { ...n, parentId: undefined, position: { x: n.position.x + g.position.x, y: n.position.y + g.position.y } } : n;
    }) as CanvasNode[]);
  }, [setNodes, snapshot]);

  const clearCanvas = useCallback(() => {
    if (!live.current.nodes.length) return;
    snapshot();
    const fresh = starterGraph();
    setNodes(fresh.nodes); setEdges(fresh.edges);
    flash('Canvas reset — Undo restores the previous one');
    window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 50);
  }, [flash, rf, setEdges, setNodes, snapshot]);

  // ── Import / export ───────────────────────────────────────────────────────
  const download = (name: string, content: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const exportJson = () => download('prompt-canvas.json', JSON.stringify(serializeCanvas(nodes, edges), null, 2), 'application/json');
  const exportText = () => { if (compiled) download('prompt.md', compiled + '\n', 'text/markdown'); };

  const onImport = async (file: File) => {
    try {
      const parsed = parseCanvasFile(JSON.parse(await file.text()));
      if (!parsed || !parsed.nodes.length) { flash('That file is not a Prompt Canvas export', 'error'); return; }
      snapshot();
      setNodes(parsed.nodes); setEdges(parsed.edges);
      flash(`Imported ${parsed.nodes.filter(isBlock).length} blocks`);
      window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300 }), 50);
    } catch { flash('Could not read that file as JSON', 'error'); }
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); }
      else if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) ungroupSelection(); else groupSelection(); }
      else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelection(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, duplicateSelection, groupSelection, ungroupSelection, deleteSelection]);

  const focusIssue = (issue: CanvasIssue) => {
    if (!issue.nodeIds.length) return;
    const ids = new Set(issue.nodeIds);
    setNodes((ns) => ns.map((n) => ({ ...n, selected: ids.has(n.id) })) as CanvasNode[]);
    if (mode !== 'editor') rf.fitView({ nodes: issue.nodeIds.map((id) => ({ id })), padding: 0.6, duration: 350, maxZoom: 1.1 });
  };

  const ctx = useMemo<Ctx>(() => ({ compiled, snapshot, flagged, openInLab }), [compiled, snapshot, flagged, openInLab]);
  const showCanvas = mode !== 'editor';
  const showText = mode !== 'visual';
  const counts = { error: issues.filter((i) => i.severity === 'error').length, warning: issues.filter((i) => i.severity === 'warning').length, info: issues.filter((i) => i.severity === 'info').length };

  return (
    <CanvasCtx.Provider value={ctx}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--background-secondary)', flexShrink: 0, flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Canvas mode" style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            {([['visual', 'Visual', LayoutGrid], ['hybrid', 'Hybrid', Columns2], ['editor', 'Editor', Type]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer', background: mode === id ? 'var(--primary-subtle)' : 'transparent', color: mode === id ? 'var(--primary-hover)' : 'var(--muted)' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <Sep />
          <TB icon={Undo2} label="Undo (Ctrl+Z)" disabled={!histLen.past} onClick={undo} />
          <TB icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!histLen.future} onClick={redo} />
          <Sep />
          <TB icon={Copy} label="Duplicate (Ctrl+D)" disabled={!selectedBlocks.length} onClick={duplicateSelection} />
          <TB icon={Group} label="Group (Ctrl+G)" disabled={selectedBlocks.filter((n) => !n.parentId).length < 2} onClick={groupSelection} />
          <TB icon={Ungroup} label="Ungroup (Ctrl+Shift+G)" disabled={!selectedGroups.length} onClick={ungroupSelection} />
          <TB icon={Unlink} label="Disconnect selected connection" disabled={!selectedEdges.length || !!selectedNodes.length} onClick={deleteSelection} />
          <TB icon={Trash2} label="Delete (Del)" disabled={!selectedNodes.length && !selectedEdges.length} onClick={deleteSelection} danger />
          <Sep />
          <TB icon={Upload} label="Import canvas (.json)" onClick={() => fileInput.current?.click()} text="Import" />
          <TB icon={Download} label="Export canvas (.json)" onClick={exportJson} text="Export" />
          <TB icon={FileText} label="Export compiled prompt (.md)" disabled={!compiled} onClick={exportText} text="Prompt" />
          <TB icon={Eraser} label="Reset canvas" onClick={clearCanvas} />
          <input ref={fileInput} type="file" accept="application/json,.json" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />

          <div style={{ flex: 1 }} />
          {notice && <span role="status" style={{ fontSize: 12, color: notice.tone === 'error' ? 'var(--destructive)' : 'var(--success)' }}>{notice.text}</span>}
          <span style={{ fontSize: 11, color: saveFailed ? 'var(--warning)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {saveFailed ? 'Autosave unavailable in this browser' : savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Not saved yet'}
          </span>
          <button onClick={openInLab} disabled={!compiled}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#fff', background: compiled ? 'var(--primary)' : 'var(--surface-hover)', border: 'none', borderRadius: 'var(--radius-md)', cursor: compiled ? 'pointer' : 'not-allowed', opacity: compiled ? 1 : 0.6 }}>
            <FlaskConical size={13} /> Analyse in Lab
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          {/* ── Block palette ──────────────────────────────────────────── */}
          {showCanvas && (
            <aside style={{ width: 196, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--background-secondary)', overflowY: 'auto', padding: 10 }}>
              <PanelTitle>Blocks</PanelTitle>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.45 }}>Click to add, or drag onto the canvas.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {BLOCKS.map((b) => {
                  const Icon = b.icon;
                  const n = nodes.filter((x) => isBlock(x) && x.data.kind === b.kind).length;
                  return (
                    <button key={b.kind} draggable
                      onDragStart={(e) => { e.dataTransfer.setData('application/forge-block', b.kind); e.dataTransfer.effectAllowed = 'move'; }}
                      onClick={() => addBlock(b.kind)}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'grab', textAlign: 'left', color: 'var(--foreground-secondary)', fontSize: 12 }}>
                      <Icon size={13} color={b.color} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{b.label}</span>
                      {n > 0 && <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{n}</span>}
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          {/* ── Canvas ─────────────────────────────────────────────────── */}
          {showCanvas && (
            <div ref={wrapper} style={{ flex: 1, minWidth: 0, position: 'relative' }}
              onDragOver={(e) => { if (e.dataTransfer.types.includes('application/forge-block')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(e) => {
                const kind = e.dataTransfer.getData('application/forge-block') as BlockKind;
                if (!kind || !BLOCK_BY_KIND[kind]) return;
                e.preventDefault();
                const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
                addBlock(kind, { x: p.x - NODE_W / 2, y: p.y - 20 });
              }}>
              <ReactFlow<CanvasNode, Edge>
                nodes={nodes} edges={edges} nodeTypes={nodeTypes}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
                onNodeDragStart={snapshot}
                deleteKeyCode={null}
                selectionOnDrag panOnDrag={[1, 2]} panOnScroll selectionMode={SelectionMode.Partial}
                multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
                minZoom={0.2} maxZoom={2} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
                colorMode="dark" proOptions={{ hideAttribution: false }}
                defaultEdgeOptions={{ style: { stroke: 'var(--border-strong)', strokeWidth: 1.5 } }}
                style={{ background: 'var(--background)' }}
              >
                <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#283247" />
                <Controls position="bottom-left" showInteractive={false} />
                <MiniMap position="bottom-right" pannable zoomable
                  nodeColor={(n) => (n.type === 'block' ? BLOCK_BY_KIND[(n as BlockNode).data.kind].color : 'transparent')}
                  maskColor="rgba(9,11,18,0.7)" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </ReactFlow>
              <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 11, color: 'var(--muted)', pointerEvents: 'none', background: 'rgba(13,17,27,0.8)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                Drag to select · Scroll or Space+drag to pan · Ctrl+scroll to zoom · Drag between dots to connect
              </div>
            </div>
          )}

          {/* ── Right: text editor and/or intelligence ─────────────────── */}
          <aside style={{ width: mode === 'editor' ? undefined : mode === 'hybrid' ? 400 : 290, flex: mode === 'editor' ? 1 : undefined, flexShrink: 0, minWidth: 0, borderLeft: showCanvas ? '1px solid var(--border)' : 'none', background: 'var(--background-secondary)', display: 'flex', flexDirection: mode === 'editor' ? 'row' : 'column', overflow: 'hidden' }}>
            {showText && (
              <div style={{ flex: mode === 'editor' ? 1 : '1 1 55%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 12, borderBottom: mode === 'hybrid' ? '1px solid var(--border)' : 'none', borderRight: mode === 'editor' ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <PanelTitle>Prompt text</PanelTitle>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{words(compiled).length} words · ≈{Math.ceil(compiled.length / 4)} tokens</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 8px', lineHeight: 1.45 }}>
                  Each <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--foreground-secondary)' }}>## Block name</code> heading maps to a block. Edits here update the blocks{mode === 'hybrid' ? ' as you type' : ''}.
                </p>
                <textarea
                  value={draft}
                  onFocus={() => { textFocused.current = true; textDirty.current = false; }}
                  onBlur={() => { textFocused.current = false; setDraft(compilePrompt(live.current.nodes, live.current.edges)); }}
                  onChange={(e) => onDraftChange(e.target.value)}
                  placeholder={'## Objective\nWhat should the AI accomplish?\n\n## Context\n…'}
                  spellCheck={false}
                  aria-label="Prompt text"
                  style={{ flex: 1, minHeight: 0, resize: 'none', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.65, outline: 'none' }}
                />
              </div>
            )}
            <div style={{ flex: mode === 'editor' ? '0 0 320px' : '1 1 45%', minHeight: 0, overflowY: 'auto', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <PanelTitle>Intelligence</PanelTitle>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--destructive)' }}>{counts.error}</span>
                  <span style={{ color: 'var(--warning)' }}>{counts.warning}</span>
                  <span style={{ color: 'var(--secondary)' }}>{counts.info}</span>
                </div>
              </div>
              {issues.length === 0 ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: 10, background: 'var(--success-subtle)', border: '1px solid rgba(69,214,160,0.25)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--foreground-secondary)', lineHeight: 1.45 }}>
                  <CheckCircle2 size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
                  The structural checks found nothing to flag. They look at how the prompt is built, not at how a model will answer it.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {issues.map((i) => {
                    const Icon = i.severity === 'error' ? AlertCircle : i.severity === 'warning' ? AlertTriangle : Info;
                    const clickable = i.nodeIds.length > 0;
                    return (
                      <button key={i.id} onClick={() => focusIssue(i)} disabled={!clickable}
                        title={clickable ? 'Show on canvas' : undefined}
                        style={{ textAlign: 'left', display: 'flex', gap: 8, padding: '8px 9px', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `2px solid ${SEVERITY_COLOR[i.severity]}`, borderRadius: 'var(--radius-md)', cursor: clickable ? 'pointer' : 'default', color: 'inherit' }}>
                        <Icon size={13} color={SEVERITY_COLOR[i.severity]} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ISSUE_LABEL[i.kind]}</span>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--foreground)', margin: '1px 0 2px' }}>{i.title}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--foreground-secondary)', lineHeight: 1.45, wordBreak: 'break-word' }}>{i.detail}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </CanvasCtx.Provider>
  );
}

// ─── Small UI atoms ─────────────────────────────────────────────────────────

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 8px' }}>{children}</h2>;
}

function Sep() {
  return <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />;
}

function TB({ icon: Icon, label, onClick, disabled, danger, text }: { icon: React.ElementType; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; text?: string }) {
  return (
    <button title={label} aria-label={label} onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = 'var(--surface-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30, minWidth: 30, padding: text ? '0 9px' : 0, justifyContent: 'center', background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'var(--border-strong)' : danger ? 'var(--destructive)' : 'var(--foreground-secondary)', fontSize: 12 }}>
      <Icon size={15} /> {text}
    </button>
  );
}

export function PromptCanvasPage() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
