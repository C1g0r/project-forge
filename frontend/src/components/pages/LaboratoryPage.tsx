import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Microscope, GitCompare, Sparkles, History, ChevronDown, ChevronRight, Plus, X, Save,
  ArrowRight, Loader2, AlertCircle, Copy, Check, Trash2, TrendingDown, TrendingUp, Minus,
  CornerDownLeft, Info,
} from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import { optimizePrompt, type OptimizeResult } from '../../lib/api';
import {
  MODEL_PROFILES, analyzePrompt, diffStats, diffWords, parameterChanges, scoreColor,
  structuralChanges, type DiffPart, type MetricResult, type PromptAnalysis,
} from '../../lib/promptAnalysis';

type Tool = 'analyze' | 'compare' | 'optimize' | 'history';

interface Version { id: string; name: string; text: string }

interface Experiment {
  id: string;
  type: 'analysis' | 'comparison' | 'optimization';
  at: string;
  title: string;
  model: string;
  overall: number;
  prompt: string;
  versions?: Version[];
  optimized?: OptimizeResult;
}

const HISTORY_KEY = 'forge.lab.history.v1';
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function loadHistory(): Experiment[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((e) => e && typeof e.id === 'string' && typeof e.prompt === 'string') : [];
  } catch { return []; }
}

const TOOLS: { id: Tool; label: string; icon: React.ElementType; hint: string }[] = [
  { id: 'analyze',  label: 'Analyzer',  icon: Microscope, hint: 'Quality evaluation across eight criteria' },
  { id: 'compare',  label: 'Compare',   icon: GitCompare, hint: 'Versions side by side, with regressions' },
  { id: 'optimize', label: 'Optimize',  icon: Sparkles,   hint: 'AI rewrite with a full change report' },
  { id: 'history',  label: 'History',   icon: History,    hint: 'Saved experiments' },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export function LaboratoryPage() {
  const { labDraft, setLabDraft } = usePromptStore();
  const [tool, setTool] = useState<Tool>('analyze');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [versions, setVersions] = useState<Version[]>([
    { id: uid(), name: 'Version A', text: '' },
    { id: uid(), name: 'Version B', text: '' },
  ]);
  const [history, setHistory] = useState<Experiment[]>(loadHistory);
  const [storageOk, setStorageOk] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Optimization
  const [goal, setGoal] = useState('');
  const [opt, setOpt] = useState<{ status: 'idle' | 'running' | 'done' | 'error'; source?: string; result?: OptimizeResult; error?: string }>({ status: 'idle' });
  const abort = useRef<AbortController | null>(null);

  // A prompt handed over from the Canvas or the Builder.
  useEffect(() => {
    if (labDraft) { setPrompt(labDraft); setTool('analyze'); setLabDraft(null); }
  }, [labDraft, setLabDraft]);

  useEffect(() => () => abort.current?.abort(), []);

  const say = (t: string) => { setToast(t); window.setTimeout(() => setToast((c) => (c === t ? null : c)), 2400); };

  const persist = (next: Experiment[]) => {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next.slice(0, 100))); setStorageOk(true); }
    catch { setStorageOk(false); }
  };
  const record = (e: Omit<Experiment, 'id' | 'at'>) => persist([{ ...e, id: uid(), at: new Date().toISOString() }, ...history]);

  const titleOf = (text: string) => {
    const first = text.split('\n').map((l) => l.replace(/^#+\s*/, '').trim()).find(Boolean) ?? 'Untitled prompt';
    return first.length > 64 ? first.slice(0, 64) + '…' : first;
  };

  const runOptimize = async () => {
    const source = prompt.trim();
    if (source.length < 10) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    const timeout = window.setTimeout(() => ctl.abort(), 120000);
    setOpt({ status: 'running', source });
    try {
      const label = MODEL_PROFILES.find((m) => m.id === model)?.label ?? model;
      const result = await optimizePrompt(source, label, goal.trim(), ctl.signal);
      if (ctl.signal.aborted) return;
      setOpt({ status: 'done', source, result });
      record({ type: 'optimization', title: titleOf(source), model, overall: analyzePrompt(result.optimized, model).overall, prompt: source, optimized: result });
    } catch (err) {
      if (abort.current !== ctl) return; // superseded by a newer run
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      setOpt({ status: 'error', source, error: aborted ? 'The request was cancelled or timed out after 2 minutes.' : err instanceof Error ? err.message : 'Unknown error.' });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const restore = (e: Experiment) => {
    setModel(e.model);
    if (e.type === 'comparison' && e.versions) { setVersions(e.versions.map((v) => ({ ...v, id: uid() }))); setTool('compare'); }
    else if (e.type === 'optimization' && e.optimized) { setPrompt(e.prompt); setOpt({ status: 'done', source: e.prompt, result: e.optimized }); setTool('optimize'); }
    else { setPrompt(e.prompt); setTool('analyze'); }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Tool bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'var(--background-secondary)', flexShrink: 0, flexWrap: 'wrap' }}>
        <div role="tablist" aria-label="Laboratory tools" style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button key={t.id} role="tab" aria-selected={active} title={t.hint} onClick={() => setTool(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12.5, fontWeight: 500, border: 'none', borderRadius: 6, cursor: 'pointer', background: active ? 'var(--primary-subtle)' : 'transparent', color: active ? 'var(--primary-hover)' : 'var(--muted)' }}>
                <t.icon size={14} /> {t.label}
                {t.id === 'history' && history.length > 0 && <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{history.length}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        {toast && <span role="status" style={{ fontSize: 12, color: 'var(--success)' }}>{toast}</span>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
          Target model
          <select value={model} onChange={(e) => setModel(e.target.value)}
            style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 8px', fontSize: 12, outline: 'none' }}>
            {MODEL_PROFILES.map((m) => <option key={m.id} value={m.id}>{m.label} — {m.provider}</option>)}
          </select>
        </label>
      </div>

      {tool === 'analyze' && (
        <AnalyzeTool prompt={prompt} setPrompt={setPrompt} model={model}
          onSave={(a) => { record({ type: 'analysis', title: titleOf(prompt), model, overall: a.overall, prompt }); say('Saved to history'); }}
          onCompare={() => { setVersions((vs) => vs.map((v, i) => (i === 0 ? { ...v, text: prompt } : v))); setTool('compare'); }}
          onOptimize={() => setTool('optimize')} />
      )}
      {tool === 'compare' && (
        <CompareTool versions={versions} setVersions={setVersions} model={model}
          onSave={() => { record({ type: 'comparison', title: titleOf(versions[0].text), model, overall: analyzePrompt(versions[0].text, model).overall, prompt: versions[0].text, versions }); say('Comparison saved to history'); }} />
      )}
      {tool === 'optimize' && (
        <OptimizeTool prompt={prompt} setPrompt={setPrompt} goal={goal} setGoal={setGoal} model={model} state={opt}
          onRun={runOptimize} onCancel={() => { const c = abort.current; abort.current = null; c?.abort(); setOpt({ status: 'idle' }); }}
          onAdopt={(text) => { setPrompt(text); setOpt({ status: 'idle' }); setTool('analyze'); say('Optimized version is now the working prompt'); }}
          onCompare={(a, b) => { setVersions([{ id: uid(), name: 'Original', text: a }, { id: uid(), name: 'Optimized', text: b }]); setTool('compare'); }} />
      )}
      {tool === 'history' && (
        <HistoryTool history={history} storageOk={storageOk} onRestore={restore}
          onDelete={(id) => persist(history.filter((h) => h.id !== id))} onClear={() => persist([])} />
      )}
    </div>
  );
}

// ─── Analyzer ───────────────────────────────────────────────────────────────

function AnalyzeTool({ prompt, setPrompt, model, onSave, onCompare, onOptimize }: {
  prompt: string; setPrompt: (s: string) => void; model: string;
  onSave: (a: PromptAnalysis) => void; onCompare: () => void; onOptimize: () => void;
}) {
  const analysis = useMemo(() => analyzePrompt(prompt, model), [prompt, model]);
  const has = prompt.trim().length > 0;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <H2>Prompt under analysis</H2>
          <Mono>{analysis.words} words · {analysis.lines} lines · ≈{analysis.estTokens.toLocaleString()} tokens</Mono>
        </div>
        <Editor value={prompt} onChange={setPrompt} placeholder="Paste or write the prompt you want to evaluate…" />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn icon={Save} disabled={!has} onClick={() => onSave(analysis)}>Save analysis</Btn>
          <Btn icon={GitCompare} disabled={!has} onClick={onCompare}>Compare versions</Btn>
          <Btn icon={Sparkles} primary disabled={prompt.trim().length < 10} onClick={onOptimize}>Optimize</Btn>
        </div>
      </section>

      <aside style={{ width: 400, flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--background-secondary)', overflowY: 'auto', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <ScoreRing score={analysis.overall} muted={!has} />
          <div>
            <H2>Quality evaluation</H2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--foreground-secondary)', lineHeight: 1.5 }}>
              {has ? 'Average of the eight criteria below. Open any criterion to see what it found.' : 'Scores appear as soon as there is text to evaluate.'}
            </p>
          </div>
        </div>
        <Disclaimer />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {analysis.metrics.map((m) => <MetricRow key={m.id} metric={m} muted={!has} />)}
        </div>
        {has && (analysis.sections.length > 0 || Object.keys(analysis.parameters).length > 0) && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analysis.sections.length > 0 && (
              <div>
                <H3>Detected sections</H3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{analysis.sections.map((s, i) => <Chip key={i}>{s}</Chip>)}</div>
              </div>
            )}
            {Object.keys(analysis.parameters).length > 0 && (
              <div>
                <H3>Detected parameters</H3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{Object.entries(analysis.parameters).map(([k, v]) => <Chip key={k}>{k}: {v}</Chip>)}</div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Disclaimer() {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '9px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--foreground-secondary)' }}>
      <Info size={13} color="var(--secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
      <span>These scores come from fixed text checks that run in your browser. They describe how the prompt is written and do not predict or guarantee the quality of a model's answer.</span>
    </div>
  );
}

function MetricRow({ metric, muted }: { metric: MetricResult; muted?: boolean }) {
  const [open, setOpen] = useState(false);
  const color = muted ? 'var(--border-strong)' : scoreColor(metric.score);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={13} color="var(--muted)" /> : <ChevronRight size={13} color="var(--muted)" />}
          <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: 'var(--foreground)' }}>{metric.label}</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color }}>{muted ? '—' : metric.score}</span>
        </span>
        <span style={{ display: 'block', height: 3, borderRadius: 2, background: 'var(--surface-active)', margin: '7px 0 6px 21px', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${muted ? 0 : metric.score}%`, background: color, transition: 'width var(--transition-base)' }} />
        </span>
        <span style={{ display: 'block', marginLeft: 21, fontSize: 11.5, color: 'var(--foreground-secondary)', lineHeight: 1.45 }}>{metric.summary}</span>
      </button>
      {open && (
        <div style={{ padding: '0 10px 10px 31px', fontSize: 11.5, lineHeight: 1.5 }}>
          {metric.evidence.length > 0 && (<><H3>What was found</H3><ul style={ul}>{metric.evidence.map((e, i) => <li key={i} style={{ color: 'var(--foreground-secondary)' }}>{e}</li>)}</ul></>)}
          {metric.advice.length > 0 && (<><H3>What would raise it</H3><ul style={ul}>{metric.advice.map((e, i) => <li key={i} style={{ color: 'var(--foreground-secondary)' }}>{e}</li>)}</ul></>)}
        </div>
      )}
    </div>
  );
}
const ul: React.CSSProperties = { margin: '0 0 8px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 };

// ─── Compare ────────────────────────────────────────────────────────────────

function CompareTool({ versions, setVersions, model, onSave }: {
  versions: Version[]; setVersions: React.Dispatch<React.SetStateAction<Version[]>>; model: string; onSave: () => void;
}) {
  const analyses = useMemo(() => versions.map((v) => analyzePrompt(v.text, model)), [versions, model]);
  const base = versions[0];
  const ready = base.text.trim() && versions.slice(1).some((v) => v.text.trim());
  const update = (id: string, patch: Partial<Version>) => setVersions((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const letter = (i: number) => String.fromCharCode(65 + i);

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <H2>Versions</H2>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{base.name} is the baseline. Every other version is compared against it.</span>
        <div style={{ flex: 1 }} />
        <Btn icon={Plus} disabled={versions.length >= 4} onClick={() => setVersions((vs) => [...vs, { id: uid(), name: `Version ${letter(vs.length)}`, text: '' }])}>Add version</Btn>
        <Btn icon={Save} disabled={!ready} onClick={onSave}>Save comparison</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))`, gap: 12 }}>
        {versions.map((v, i) => (
          <div key={v.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: i === 0 ? 'var(--primary-subtle)' : 'var(--secondary-subtle)', color: i === 0 ? 'var(--primary-hover)' : 'var(--secondary)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{letter(i)}</span>
              <input value={v.name} onChange={(e) => update(v.id, { name: e.target.value })} aria-label={`Name of version ${letter(i)}`}
                style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', color: 'var(--foreground)', fontSize: 13, fontWeight: 600, outline: 'none' }} />
              {i === 0 && <Chip>Baseline</Chip>}
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: v.text.trim() ? scoreColor(analyses[i].overall) : 'var(--muted)' }}>{v.text.trim() ? analyses[i].overall : '—'}</span>
              {versions.length > 2 && (
                <button aria-label={`Remove ${v.name}`} title="Remove version" onClick={() => setVersions((vs) => vs.filter((x) => x.id !== v.id))}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, display: 'flex' }}><X size={14} /></button>
              )}
            </div>
            <Editor value={v.text} onChange={(t) => update(v.id, { text: t })} placeholder={i === 0 ? 'Baseline version…' : 'Version to compare…'} height={220} />
          </div>
        ))}
      </div>

      {!ready ? (
        <Empty>Fill in the baseline and at least one other version to see the differences.</Empty>
      ) : (
        <>
          <div>
            <H2>Evaluation differences</H2>
            <DeltaTable names={versions.map((v) => v.name)} analyses={analyses} filled={versions.map((v) => !!v.text.trim())} />
            <div style={{ marginTop: 8 }}><Disclaimer /></div>
          </div>
          {versions.slice(1).map((v) => v.text.trim() ? (
            <DiffPanel key={v.id} title={`${base.name} → ${v.name}`} from={base.text} to={v.text} />
          ) : null)}
        </>
      )}
    </div>
  );
}

function DeltaTable({ names, analyses, filled }: { names: string[]; analyses: PromptAnalysis[]; filled: boolean[] }) {
  const cell: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' };
  const rows = [...analyses[0].metrics.map((m, i) => ({ label: m.label, values: analyses.map((a) => a.metrics[i].score) })), { label: 'Overall', values: analyses.map((a) => a.overall) }];
  const regressions = names.slice(1).map((_, k) => filled[k + 1] ? rows.slice(0, -1).filter((r) => r.values[k + 1] <= r.values[0] - 5).map((r) => r.label) : []);
  return (
    <>
      <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: 'left', fontFamily: 'var(--font-sans)', color: 'var(--muted)', fontWeight: 500 }}>Criterion</th>
              {names.map((n, i) => <th key={i} style={{ ...cell, color: 'var(--muted)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.label} style={ri === rows.length - 1 ? { background: 'var(--surface-elevated)' } : undefined}>
                <td style={{ ...cell, textAlign: 'left', fontFamily: 'var(--font-sans)', color: 'var(--foreground)', fontWeight: ri === rows.length - 1 ? 600 : 400, borderBottom: ri === rows.length - 1 ? 'none' : cell.borderBottom }}>{r.label}</td>
                {r.values.map((v, i) => {
                  const d = v - r.values[0];
                  const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
                  const col = d >= 5 ? 'var(--success)' : d <= -5 ? 'var(--destructive)' : 'var(--muted)';
                  return (
                    <td key={i} style={{ ...cell, color: 'var(--foreground-secondary)', borderBottom: ri === rows.length - 1 ? 'none' : cell.borderBottom }}>
                      {!filled[i] ? '—' : i === 0 ? v : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {v}
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: col, minWidth: 44, justifyContent: 'flex-end' }}>
                            <Icon size={11} /> {d > 0 ? `+${d}` : d}
                          </span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {regressions.map((r, k) => r.length > 0 && (
        <div key={k} style={{ display: 'flex', gap: 8, marginTop: 8, padding: '8px 10px', background: 'var(--destructive-subtle)', border: '1px solid rgba(255,102,124,0.25)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--foreground-secondary)', lineHeight: 1.45 }}>
          <TrendingDown size={13} color="var(--destructive)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span><strong style={{ color: 'var(--foreground)' }}>{names[k + 1]}</strong> scores at least 5 points lower than the baseline on {r.join(', ')}.</span>
        </div>
      ))}
    </>
  );
}

function DiffPanel({ title, from, to }: { title: string; from: string; to: string }) {
  const parts = useMemo(() => diffWords(from, to), [from, to]);
  const stats = diffStats(parts);
  const structure = useMemo(() => structuralChanges(from, to), [from, to]);
  const params = useMemo(() => parameterChanges(from, to), [from, to]);
  const identical = stats.added === 0 && stats.removed === 0;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <H2>{title}</H2>
        <Mono><span style={{ color: 'var(--success)' }}>+{stats.added} words</span> · <span style={{ color: 'var(--destructive)' }}>−{stats.removed} words</span></Mono>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 12, marginTop: 8 }}>
        <DiffView parts={parts} identical={identical} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Card>
            <H3>Structural changes</H3>
            {structure.length === 0 ? <None>Same labelled sections in both.</None> : (
              <ul style={{ ...ul, listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
                {structure.map((s, i) => <li key={i} style={{ fontSize: 12, color: s.kind === 'added' ? 'var(--success)' : 'var(--destructive)' }}>{s.kind === 'added' ? '+ Section added: ' : '− Section removed: '}<span style={{ color: 'var(--foreground-secondary)' }}>{s.section}</span></li>)}
              </ul>
            )}
          </Card>
          <Card>
            <H3>Parameters modified</H3>
            {params.length === 0 ? <None>No parameter values changed.</None> : (
              <ul style={{ ...ul, listStyle: 'none', paddingLeft: 0, marginBottom: 0 }}>
                {params.map((p) => (
                  <li key={p.key} style={{ fontSize: 12, color: 'var(--foreground-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {p.key}: <span style={{ color: 'var(--destructive)' }}>{p.from ?? '∅'}</span> → <span style={{ color: 'var(--success)' }}>{p.to ?? '∅'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function DiffView({ parts, identical }: { parts: DiffPart[]; identical: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 360, flexShrink: 0, overflowY: 'auto', color: 'var(--foreground-secondary)' }}>
      {identical ? <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-sans)' }}>The two texts are identical.</span> : parts.map((p, i) =>
        p.type === 'same' ? <span key={i}>{p.text}</span>
        : p.type === 'add' ? <ins key={i} style={{ background: 'rgba(69,214,160,0.18)', color: '#9FF0CF', textDecoration: 'none', borderRadius: 2 }}>{p.text}</ins>
        : <del key={i} style={{ background: 'rgba(255,102,124,0.16)', color: '#FF9DAC', borderRadius: 2 }}>{p.text}</del>)}
    </div>
  );
}

// ─── Optimize ───────────────────────────────────────────────────────────────

function OptimizeTool({ prompt, setPrompt, goal, setGoal, model, state, onRun, onCancel, onAdopt, onCompare }: {
  prompt: string; setPrompt: (s: string) => void; goal: string; setGoal: (s: string) => void; model: string;
  state: { status: 'idle' | 'running' | 'done' | 'error'; source?: string; result?: OptimizeResult; error?: string };
  onRun: () => void; onCancel: () => void; onAdopt: (text: string) => void; onCompare: (a: string, b: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'diff' | 'text'>('diff');
  const result = state.status === 'done' ? state.result : undefined;
  const source = state.source ?? '';
  const before = useMemo(() => analyzePrompt(source, model), [source, model]);
  const after = useMemo(() => analyzePrompt(result?.optimized ?? '', model), [result, model]);
  const parts = useMemo(() => (result ? diffWords(source, result.optimized) : []), [result, source]);
  const stale = !!result && prompt.trim() !== source;
  const changeColor = { added: 'var(--success)', removed: 'var(--destructive)', restructured: 'var(--secondary)', clarified: 'var(--primary-hover)' } as const;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <section style={{ width: '38%', minWidth: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 16, gap: 10, borderRight: '1px solid var(--border)' }}>
        <H2>Original prompt</H2>
        <Editor value={prompt} onChange={setPrompt} placeholder="The prompt to optimize…" />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
          Focus (optional)
          <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="e.g. make the output format stricter"
            style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', fontSize: 12.5, outline: 'none' }} />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {state.status === 'running'
            ? <Btn icon={X} onClick={onCancel}>Cancel</Btn>
            : <Btn icon={Sparkles} primary disabled={prompt.trim().length < 10} onClick={onRun}>{result ? 'Optimize again' : 'Optimize prompt'}</Btn>}
          <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>Sends the prompt to the AI model configured on your backend.</span>
        </div>
      </section>

      <section style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {state.status === 'idle' && <Empty>The optimized version, the differences and the list of changes appear here after you run an optimization.</Empty>}

        {state.status === 'running' && (
          <div role="status" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--foreground-secondary)', fontSize: 13 }}>
            <Loader2 size={22} color="var(--primary)" style={{ animation: 'spin 0.9s linear infinite' }} />
            Waiting for the model…
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>A cold backend can take up to a minute to wake.</span>
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" style={{ display: 'flex', gap: 10, padding: 14, background: 'var(--destructive-subtle)', border: '1px solid rgba(255,102,124,0.3)', borderRadius: 'var(--radius-lg)' }}>
            <AlertCircle size={16} color="var(--destructive)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>The optimization did not run</div>
              <div style={{ fontSize: 12.5, color: 'var(--foreground-secondary)', marginTop: 4, lineHeight: 1.5 }}>{state.error}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Nothing was changed. No result is shown because none was produced.</div>
            </div>
          </div>
        )}

        {result && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <H2>Optimized prompt</H2>
              <Mono>{(result.model.split(/[\\/]/).pop() ?? result.model).slice(0, 60)} · {(result.latencyMs / 1000).toFixed(1)}s</Mono>
              <div style={{ flex: 1 }} />
              <div role="tablist" style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                {(['diff', 'text'] as const).map((v) => (
                  <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
                    style={{ padding: '4px 10px', fontSize: 12, border: 'none', borderRadius: 5, cursor: 'pointer', background: view === v ? 'var(--primary-subtle)' : 'transparent', color: view === v ? 'var(--primary-hover)' : 'var(--muted)' }}>
                    {v === 'diff' ? 'Differences' : 'Clean text'}
                  </button>
                ))}
              </div>
            </div>
            {stale && (
              <div style={{ fontSize: 12, color: 'var(--warning)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <AlertCircle size={13} /> The original was edited after this run. The result below refers to the earlier text.
              </div>
            )}
            {view === 'diff'
              ? <DiffView parts={parts} identical={result.optimized.trim() === source.trim()} />
              : <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 360, flexShrink: 0, overflowY: 'auto', color: 'var(--foreground)' }}>{result.optimized}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn icon={CornerDownLeft} primary onClick={() => onAdopt(result.optimized)}>Use as working prompt</Btn>
              <Btn icon={GitCompare} onClick={() => onCompare(source, result.optimized)}>Open in Compare</Btn>
              <Btn icon={copied ? Check : Copy} onClick={() => { navigator.clipboard?.writeText(result.optimized).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => {}); }}>{copied ? 'Copied' : 'Copy'}</Btn>
            </div>

            <div>
              <H2>Changes introduced</H2>
              <p style={{ margin: '4px 0 8px', fontSize: 11.5, color: 'var(--muted)' }}>As reported by the model. Check them against the differences above.</p>
              {result.changes.length === 0 ? <None>The model did not list individual changes.</None> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.changes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: changeColor[c.type] ?? 'var(--muted)', width: 86, flexShrink: 0, paddingTop: 2 }}>{c.type}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--foreground-secondary)', lineHeight: 1.5 }}>{c.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <H2>Evaluation before and after</H2>
              <DeltaTable names={['Original', 'Optimized']} analyses={[before, after]} filled={[true, true]} />
              <div style={{ marginTop: 8 }}><Disclaimer /></div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// ─── History ────────────────────────────────────────────────────────────────

function HistoryTool({ history, storageOk, onRestore, onDelete, onClear }: {
  history: Experiment[]; storageOk: boolean; onRestore: (e: Experiment) => void; onDelete: (id: string) => void; onClear: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const typeMeta = { analysis: { label: 'Analysis', icon: Microscope, color: 'var(--secondary)' }, comparison: { label: 'Comparison', icon: GitCompare, color: 'var(--warning)' }, optimization: { label: 'Optimization', icon: Sparkles, color: 'var(--primary-hover)' } } as const;
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <H2>Experiment history</H2>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Stored in this browser only.</span>
        <div style={{ flex: 1 }} />
        {history.length > 0 && (confirm ? (
          <>
            <span style={{ fontSize: 12, color: 'var(--warning)' }}>Delete all {history.length} experiments? This cannot be undone.</span>
            <Btn icon={Trash2} danger onClick={() => { onClear(); setConfirm(false); }}>Delete all</Btn>
            <Btn onClick={() => setConfirm(false)}>Keep</Btn>
          </>
        ) : <Btn icon={Trash2} onClick={() => setConfirm(true)}>Clear history</Btn>)}
      </div>
      {!storageOk && <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 10 }}>This browser is blocking local storage, so history will be lost when the page closes.</div>}
      {history.length === 0 ? (
        <Empty>No experiments yet. Analyses you save, comparisons you save and every optimization run are listed here.</Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {history.map((e) => {
            const meta = typeMeta[e.type] ?? typeMeta.analysis;
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <meta.icon size={15} color={meta.color} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    {meta.label} · {MODEL_PROFILES.find((m) => m.id === e.model)?.label ?? e.model} · {new Date(e.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    {e.type === 'comparison' && e.versions ? ` · ${e.versions.length} versions` : ''}
                  </div>
                </div>
                <span title="Overall heuristic score" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: scoreColor(e.overall) }}>{e.overall}</span>
                <Btn icon={ArrowRight} onClick={() => onRestore(e)}>Open</Btn>
                <button aria-label="Delete experiment" title="Delete" onClick={() => onDelete(e.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-display)' }}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{children}</h3>;
}
function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{children}</span>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--foreground-secondary)', whiteSpace: 'nowrap' }}>{children}</span>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12 }}>{children}</div>;
}
function None({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: 'var(--muted)' }}>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '36px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', lineHeight: 1.5 }}>{children}</div>;
}

function Editor({ value, onChange, placeholder, height }: { value: string; onChange: (s: string) => void; placeholder?: string; height?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} spellCheck={false}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      style={{ flex: height ? undefined : 1, height, minHeight: 0, resize: 'none', background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.65, outline: 'none', transition: 'border-color var(--transition-fast)' }} />
  );
}

function Btn({ children, icon: Icon, onClick, disabled, primary, danger }: { children: React.ReactNode; icon?: React.ElementType; onClick: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  const bg = primary ? 'var(--primary)' : danger ? 'var(--destructive)' : 'var(--surface)';
  const hover = primary ? 'var(--primary-hover)' : danger ? 'var(--destructive)' : 'var(--surface-hover)';
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bg; }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', color: primary || danger ? '#fff' : 'var(--foreground-secondary)', background: bg, border: primary || danger ? '1px solid transparent' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'background var(--transition-fast)' }}>
      {Icon && <Icon size={14} />} {children}
    </button>
  );
}

function ScoreRing({ score, muted }: { score: number; muted?: boolean }) {
  const r = 26, c = 2 * Math.PI * r;
  const color = muted ? 'var(--border-strong)' : scoreColor(score);
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={muted ? 'No score yet' : `Overall score ${score} out of 100`} style={{ flexShrink: 0 }}>
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--surface-active)" strokeWidth="5" />
      <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - (muted ? 0 : score) / 100)} transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset var(--transition-slow)' }} />
      <text x="34" y="39" textAnchor="middle" fontSize="17" fontWeight="700" fill={muted ? 'var(--muted)' : 'var(--foreground)'} fontFamily="var(--font-display)">{muted ? '—' : score}</text>
    </svg>
  );
}
