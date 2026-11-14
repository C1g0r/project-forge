import { useState, useRef, useEffect } from 'react';
import { usePromptStore } from '../../store/usePromptStore';
import {
  Target, User, BookOpen, List, FileCheck, Ban, Palette,
  SlidersHorizontal, FileOutput, Star, Wand2, Sparkles,
  CheckCircle, RotateCcw, ArrowUpCircle, Minimize2, Languages,
  GitCompare, Save, Copy, Download, ChevronRight,
  Bot, Zap, AlertCircle, Lightbulb, Cpu,
  FlashlightIcon, Layers,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type BuildMode = 'quick' | 'guided' | 'expert' | 'hybrid';

interface PromptSection {
  id: string;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  description: string;
}

interface ActionButton {
  id: string;
  label: string;
  icon: React.ElementType;
  primary?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

type QualityLevel = 'none' | 'low' | 'medium' | 'high' | 'excellent';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: PromptSection[] = [
  { id: 'title',       label: 'Prompt Title',    icon: Layers,          placeholder: 'Give this prompt a name…',                         description: 'Descriptive name for this prompt' },
  { id: 'objective',   label: 'Objective',       icon: Target,          placeholder: 'What should the AI accomplish…',                   description: 'Main goal and expected result' },
  { id: 'role',        label: 'Role',            icon: User,            placeholder: 'You are an expert in…',                           description: 'AI persona and expertise' },
  { id: 'context',     label: 'Context',         icon: BookOpen,        placeholder: 'Background information the AI needs to know…',    description: 'Background and situational info' },
  { id: 'instructions',label: 'Instructions',    icon: List,            placeholder: 'Step-by-step instructions…',                       description: 'Detailed operational steps' },
  { id: 'requirements',label: 'Requirements',    icon: FileCheck,       placeholder: 'The output must include…',                        description: 'Mandatory output criteria' },
  { id: 'constraints', label: 'Constraints',     icon: Ban,             placeholder: 'Do not include… avoid… never…',                   description: 'Hard limits and exclusions' },
  { id: 'style',       label: 'Style',           icon: Palette,         placeholder: 'Tone: professional. Voice: active. Format: …',    description: 'Tone, voice and writing style' },
  { id: 'parameters',  label: 'Parameters',      icon: SlidersHorizontal,placeholder: 'Temperature: 0.7. Max tokens: 2000…',           description: 'Model parameters and tuning' },
  { id: 'outputFormat',label: 'Output Format',   icon: FileOutput,      placeholder: 'Return a JSON object with keys… / markdown list…', description: 'Structure of the expected result' },
  { id: 'quality',     label: 'Quality Criteria', icon: Star,           placeholder: 'Success means… measure quality by…',              description: 'How to evaluate the result' },
];

const MODELS = [
  { id: 'gpt-4o',              label: 'GPT-4o',               provider: 'OpenAI' },
  { id: 'gpt-4o-mini',         label: 'GPT-4o Mini',          provider: 'OpenAI' },
  { id: 'claude-sonnet-4-5',   label: 'Claude Sonnet 4.5',    provider: 'Anthropic' },
  { id: 'claude-haiku-3-5',    label: 'Claude Haiku 3.5',     provider: 'Anthropic' },
  { id: 'gemini-2-flash',      label: 'Gemini 2.0 Flash',     provider: 'Google' },
  { id: 'gemini-1-5-pro',      label: 'Gemini 1.5 Pro',       provider: 'Google' },
  { id: 'llama-3-3-70b',       label: 'Llama 3.3 70B',        provider: 'Meta' },
  { id: 'mistral-large',       label: 'Mistral Large',        provider: 'Mistral' },
];

const ACTIONS: ActionButton[] = [
  { id: 'build',      label: 'Build Prompt', icon: Wand2,       primary: true, variant: 'primary' },
  { id: 'improve',    label: 'Improve',      icon: Sparkles,    variant: 'default' },
  { id: 'optimize',   label: 'Optimize',     icon: Zap,         variant: 'default' },
  { id: 'validate',   label: 'Validate',     icon: CheckCircle, variant: 'success' },
  { id: 'rewrite',    label: 'Rewrite',      icon: RotateCcw,   variant: 'default' },
  { id: 'expand',     label: 'Expand',       icon: ArrowUpCircle, variant: 'default' },
  { id: 'simplify',   label: 'Simplify',     icon: Minimize2,   variant: 'default' },
  { id: 'translate',  label: 'Translate',    icon: Languages,   variant: 'default' },
  { id: 'compare',    label: 'Compare',      icon: GitCompare,  variant: 'default' },
  { id: 'save',       label: 'Save',         icon: Save,        variant: 'default' },
  { id: 'duplicate',  label: 'Duplicate',    icon: Copy,        variant: 'default' },
  { id: 'export',     label: 'Export',       icon: Download,    variant: 'default' },
];

const BUILD_MODES: { id: BuildMode; label: string; short: string }[] = [
  { id: 'quick',   label: 'Quick Build',   short: 'Quick' },
  { id: 'guided',  label: 'Guided Build',  short: 'Guided' },
  { id: 'expert',  label: 'Expert Build',  short: 'Expert' },
  { id: 'hybrid',  label: 'Hybrid Build',  short: 'Hybrid' },
];

// ─── Quality helpers ──────────────────────────────────────────────────────────

function computeQuality(values: Record<string, string>): { level: QualityLevel; score: number; filled: number } {
  const critical = ['objective', 'instructions'];
  const important = ['role', 'context', 'requirements', 'outputFormat'];
  const optional = ['constraints', 'style', 'parameters', 'quality'];

  let score = 0;
  let filled = 0;

  for (const id of critical)   { if (values[id]?.trim()) { score += 20; filled++; } }
  for (const id of important)  { if (values[id]?.trim()) { score += 10; filled++; } }
  for (const id of optional)   { if (values[id]?.trim()) { score +=  5; filled++; } }

  const level: QualityLevel =
    score === 0 ? 'none' :
    score <= 20 ? 'low' :
    score <= 50 ? 'medium' :
    score <= 70 ? 'high' : 'excellent';

  return { level, score: Math.min(score, 100), filled };
}

const qualityColor: Record<QualityLevel, string> = {
  none:      'var(--border-strong)',
  low:       'var(--destructive)',
  medium:    'var(--warning)',
  high:      'var(--success)',
  excellent: 'var(--primary)',
};

const qualityLabel: Record<QualityLevel, string> = {
  none:      'Empty',
  low:       'Weak',
  medium:    'Fair',
  high:      'Strong',
  excellent: 'Excellent',
};

// ─── PromptBuilderPage ────────────────────────────────────────────────────────

export function PromptBuilderPage() {
  const { setView } = usePromptStore();

  const [mode, setMode]               = useState<BuildMode>('guided');
  const [activeSection, setActive]    = useState<string>('objective');
  const [values, setValues]           = useState<Record<string, string>>({});
  const [selectedModel, setModel]     = useState<string>('gpt-4o');
  const [quickText, setQuickText]     = useState('');
  const [actionFeedback, setFeedback] = useState<string | null>(null);
  const [modelOpen, setModelOpen]     = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quality = computeQuality(values);
  const currentModel = MODELS.find((m) => m.id === selectedModel)!;

  // sections visible in this mode
  const visibleSections = mode === 'quick'
    ? SECTIONS.slice(0, 1) // title only in structure
    : mode === 'guided'
      ? SECTIONS.filter((s) => ['objective','role','context','instructions','requirements','outputFormat'].includes(s.id))
      : SECTIONS;

  function setValue(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function handleAction(id: string) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    const messages: Record<string, string> = {
      build:     '✓ Prompt built',
      improve:   '✓ Improvements applied',
      optimize:  '✓ Optimized for target model',
      validate:  '✓ Validation complete',
      rewrite:   '✓ Prompt rewritten',
      expand:    '✓ Prompt expanded',
      simplify:  '✓ Prompt simplified',
      translate: '✓ Translation queued',
      compare:   '→ Opening comparison…',
      save:      '✓ Saved to Library',
      duplicate: '✓ Duplicate created',
      export:    '✓ Exported',
    };
    setFeedback(messages[id] ?? '✓ Done');
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2500);
    if (id === 'compare') setView('lab');
  }

  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);

  const activeSec = SECTIONS.find((s) => s.id === activeSection)!;
  const qualColor = qualityColor[quality.level];

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        gap: 0,
        minHeight: 0,
      }}
    >
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: '220px',
          flexShrink: 0,
          backgroundColor: 'var(--background-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Mode selector */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Build Mode
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {BUILD_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: mode === m.id ? 'var(--primary-subtle)' : 'transparent',
                  color: mode === m.id ? 'var(--primary)' : 'var(--foreground-secondary)',
                  fontSize: '12px',
                  fontWeight: mode === m.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 150ms ease',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: mode === m.id ? 'var(--primary)' : 'var(--border-strong)',
                    flexShrink: 0,
                  }}
                />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
            Structure
          </div>
          {(mode === 'quick' ? SECTIONS : visibleSections).map((sec) => {
            const Icon = sec.icon;
            const isFilled = !!(values[sec.id]?.trim());
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                onClick={() => { setActive(sec.id); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                  color: isActive ? 'var(--foreground)' : 'var(--foreground-secondary)',
                  fontSize: '12px',
                  fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms ease',
                }}
              >
                <Icon size={13} style={{ flexShrink: 0, color: isActive ? 'var(--primary)' : 'var(--muted)' }} />
                <span style={{ flex: 1 }}>{sec.label}</span>
                {isFilled && (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />
                )}
                {isActive && <ChevronRight size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />}
              </button>
            );
          })}

          {mode === 'expert' && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', padding: '12px 8px 6px' }}>
                Expert Sections
              </div>
              {SECTIONS.filter((s) => !visibleSections.map((v) => v.id).includes(s.id)).map((sec) => {
                const Icon = sec.icon;
                const isFilled = !!(values[sec.id]?.trim());
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActive(sec.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none',
                      backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                      color: isActive ? 'var(--foreground)' : 'var(--muted)',
                      fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{sec.label}</span>
                    {isFilled && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer quality mini */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Quality</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: qualColor }}>{qualityLabel[quality.level]}</span>
          </div>
          <div style={{ height: '3px', borderRadius: '2px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${quality.score}%`, backgroundColor: qualColor, transition: 'width 400ms ease, background-color 400ms ease' }} />
          </div>
        </div>
      </aside>

      {/* ── CENTER PANEL ───────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--background)',
        }}
      >
        {/* Editor header */}
        <div
          style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            placeholder="Untitled Prompt…"
            value={values['title'] ?? ''}
            onChange={(e) => setValue('title', e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--foreground)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.01em',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {BUILD_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: mode === m.id ? 'var(--primary)' : 'transparent',
                  color: mode === m.id ? '#fff' : 'var(--muted)',
                  fontSize: '11px',
                  fontWeight: mode === m.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {/* Editor body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {mode === 'quick' ? (
            /* Quick mode: single textarea */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Describe your prompt in plain language — we'll structure it automatically.
              </label>
              <textarea
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Write your complete prompt idea here… e.g. 'Create a prompt that generates product descriptions for an e-commerce store, in a friendly professional tone, with bullet points.'"
                style={{
                  flex: 1,
                  resize: 'none',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  fontSize: '14px',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 1.6,
                  outline: 'none',
                  minHeight: '300px',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>
          ) : mode === 'hybrid' ? (
            /* Hybrid: side-by-side fields + compiled result */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%', minHeight: '400px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {visibleSections.filter((s) => s.id !== 'title').map((sec) => (
                  <SectionField key={sec.id} sec={sec} value={values[sec.id] ?? ''} onChange={(v) => setValue(sec.id, v)} compact />
                ))}
              </div>
              <CompiledPreview values={values} sections={visibleSections} />
            </div>
          ) : (
            /* Guided / Expert: active section editor */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' }}>
              {/* Active section */}
              <SectionField sec={activeSec} value={values[activeSec.id] ?? ''} onChange={(v) => setValue(activeSec.id, v)} large />

              {/* Quick nav to other sections */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', alignSelf: 'center', marginRight: '4px' }}>Jump to:</span>
                {visibleSections
                  .filter((s) => s.id !== activeSection && s.id !== 'title')
                  .map((sec) => {
                    const Icon = sec.icon;
                    const filled = !!(values[sec.id]?.trim());
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setActive(sec.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '4px 10px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)', backgroundColor: 'var(--surface-elevated)',
                          color: filled ? 'var(--foreground-secondary)' : 'var(--muted)',
                          fontSize: '11px', cursor: 'pointer',
                        }}
                      >
                        <Icon size={10} />
                        {sec.label}
                        {filled && <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            backgroundColor: 'var(--background-secondary)',
            flexShrink: 0,
          }}
        >
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            const isPrimary = a.id === 'build';
            return (
              <ActionBtn key={a.id} label={a.label} icon={<Icon size={12} />} primary={isPrimary} onClick={() => handleAction(a.id)} />
            );
          })}
          {actionFeedback && (
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--success)', fontWeight: 500 }}>
              {actionFeedback}
            </span>
          )}
        </div>
      </main>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          backgroundColor: 'var(--background-secondary)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={13} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground-secondary)' }}>Intelligence Panel</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

          {/* Model target */}
          <PanelSection title="Target Model">
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setModelOpen((o) => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', backgroundColor: 'var(--surface-elevated)',
                  color: 'var(--foreground)', fontSize: '12px', cursor: 'pointer',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Bot size={12} style={{ color: 'var(--primary)' }} />
                  {currentModel.label}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{currentModel.provider}</span>
              </button>
              {modelOpen && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', marginTop: '4px', overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setModel(m.id); setModelOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px', border: 'none',
                        backgroundColor: m.id === selectedModel ? 'var(--primary-subtle)' : 'transparent',
                        color: m.id === selectedModel ? 'var(--primary)' : 'var(--foreground-secondary)',
                        fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {m.label}
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{m.provider}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PanelSection>

          {/* Quality score */}
          <PanelSection title="Quality Score">
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: `3px solid ${qualColor}`,
                  marginBottom: '6px',
                  transition: 'border-color 400ms ease',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 700, color: qualColor, fontFamily: 'var(--font-display)', transition: 'color 400ms ease' }}>
                  {quality.score}
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: qualColor }}>{qualityLabel[quality.level]}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{quality.filled} / {SECTIONS.length - 1} sections filled</div>
            </div>
          </PanelSection>

          {/* Suggestions */}
          <PanelSection title="Suggestions">
            {quality.score === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--muted)', padding: '4px 0' }}>
                Start filling sections to get suggestions.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!values['role']?.trim() && (
                  <Suggestion icon={<Lightbulb size={11} />} color="var(--warning)" onClick={() => setActive('role')}>
                    Add a Role to constrain AI behaviour
                  </Suggestion>
                )}
                {!values['outputFormat']?.trim() && (
                  <Suggestion icon={<Lightbulb size={11} />} color="var(--warning)" onClick={() => setActive('outputFormat')}>
                    Define an Output Format for consistency
                  </Suggestion>
                )}
                {!values['constraints']?.trim() && values['instructions']?.trim() && (
                  <Suggestion icon={<Lightbulb size={11} />} color="var(--secondary)" onClick={() => setActive('constraints')}>
                    Consider adding Constraints to avoid common failure modes
                  </Suggestion>
                )}
                {quality.score >= 60 && (
                  <Suggestion icon={<Zap size={11} />} color="var(--success)">
                    Looking strong — run Validate before final use
                  </Suggestion>
                )}
              </div>
            )}
          </PanelSection>

          {/* Validation */}
          <PanelSection title="Validation">
            {quality.score === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Nothing to validate yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <ValidationRow ok={!!(values['objective']?.trim())} label="Objective defined" />
                <ValidationRow ok={!!(values['instructions']?.trim())} label="Instructions present" />
                <ValidationRow ok={!!(values['outputFormat']?.trim())} label="Output format set" />
                <ValidationRow ok={!!(values['role']?.trim())} label="Role assigned" />
                <ValidationRow ok={quality.score >= 50} label="Minimum quality threshold" />
              </div>
            )}
          </PanelSection>

        </div>
      </aside>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionField({
  sec, value, onChange, large, compact,
}: {
  sec: PromptSection;
  value: string;
  onChange: (v: string) => void;
  large?: boolean;
  compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const Icon = sec.icon;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <Icon size={13} style={{ color: focused ? 'var(--primary)' : 'var(--muted)' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--foreground-secondary)' }}>{sec.label}</span>
        {!compact && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>{sec.description}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={sec.placeholder}
        rows={compact ? 3 : large ? 8 : 5}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          resize: compact ? 'none' : 'vertical',
          backgroundColor: 'var(--surface)',
          border: `1px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '10px 12px',
          fontSize: '13px',
          color: 'var(--foreground)',
          fontFamily: 'var(--font-sans)',
          lineHeight: 1.6,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease',
          boxShadow: focused ? '0 0 0 3px var(--primary-subtle)' : 'none',
        }}
      />
    </div>
  );
}

function CompiledPreview({ values, sections }: { values: Record<string, string>; sections: PromptSection[] }) {
  const compiled = sections
    .filter((s) => s.id !== 'title' && values[s.id]?.trim())
    .map((s) => `## ${s.label}\n${values[s.id].trim()}`)
    .join('\n\n');

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--foreground-secondary)',
        lineHeight: 1.7,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {compiled || (
        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-sans)', fontSize: '12px' }}>
          Fill in the sections on the left to preview the compiled prompt here.
        </span>
      )}
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Suggestion({ icon, color, children, onClick }: {
  icon: React.ReactNode; color: string; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '7px', textAlign: 'left',
        padding: '7px 9px', borderRadius: 'var(--radius-md)',
        border: 'none', backgroundColor: 'var(--surface)',
        color: 'var(--foreground-secondary)', fontSize: '11px', cursor: onClick ? 'pointer' : 'default',
        lineHeight: 1.4, width: '100%',
      }}
    >
      <span style={{ color, flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      {children}
    </button>
  );
}

function ValidationRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      {ok
        ? <CheckCircle size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
        : <AlertCircle size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      }
      <span style={{ fontSize: '11px', color: ok ? 'var(--foreground-secondary)' : 'var(--muted)' }}>{label}</span>
    </div>
  );
}

function ActionBtn({ label, icon, primary, onClick }: {
  label: string; icon: React.ReactNode; primary?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '5px 10px', borderRadius: 'var(--radius-md)',
        border: primary ? 'none' : '1px solid var(--border)',
        backgroundColor: primary ? 'var(--primary)' : 'transparent',
        color: primary ? '#fff' : 'var(--foreground-secondary)',
        fontSize: '11px', fontWeight: primary ? 600 : 400, cursor: 'pointer',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={(e) => { if (!primary) e.currentTarget.style.backgroundColor = 'var(--surface-elevated)'; }}
      onMouseLeave={(e) => { if (!primary) e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {icon}
      {label}
    </button>
  );
}
