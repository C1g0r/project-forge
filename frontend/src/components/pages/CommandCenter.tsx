import { useState } from 'react';
import { usePromptStore } from '../../store/usePromptStore';
import {
  Wand2, GitBranch, Sparkles, FolderOpen,
  Image, Video, Code2, FileText, Music, Workflow,
  Zap, TrendingUp, Layers, Cpu, Star, DollarSign,
  Clock, ArrowRight, Plus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  view: string;
}

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}

interface ActivityItem {
  id: string;
  type: 'prompt' | 'project' | 'run' | 'comparison';
  label: string;
  meta: string;
  time: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const quickActions: QuickAction[] = [
  { label: 'Create Image Prompt',    icon: Image,    color: 'var(--primary)',     view: 'studio-image' },
  { label: 'Create Video Prompt',    icon: Video,    color: 'var(--secondary)',   view: 'studio-video' },
  { label: 'Generate Code Prompt',   icon: Code2,    color: 'var(--success)',     view: 'studio-code' },
  { label: 'Write Professional Content', icon: FileText, color: 'var(--warning)',  view: 'studio-text' },
  { label: 'Create Music Prompt',    icon: Music,    color: '#C084FC',            view: 'studio-music' },
  { label: 'Build Custom Workflow',  icon: Workflow, color: 'var(--muted)',       view: 'workflow' },
];

const stats: StatCard[] = [
  { label: 'Prompts criados',     value: '—',   icon: Wand2,      trend: undefined },
  { label: 'Projetos ativos',     value: '—',   icon: Layers,     trend: undefined },
  { label: 'Modelos configurados',value: '—',   icon: Cpu,        trend: undefined },
  { label: 'Execuções',           value: '—',   icon: Zap,        trend: undefined },
  { label: 'Avaliação média',     value: '—',   icon: Star,       trend: undefined },
  { label: 'Custo total',         value: '—',   icon: DollarSign, trend: undefined },
];

const activity: ActivityItem[] = [
  {
    id: '1', type: 'prompt',
    label: 'Novo prompt criado',
    meta: 'Image Studio · GPT-4o',
    time: 'Agora',
  },
  {
    id: '2', type: 'run',
    label: 'Prompt executado com sucesso',
    meta: 'Claude 3.5 Sonnet',
    time: '2 min',
  },
  {
    id: '3', type: 'comparison',
    label: 'Comparação iniciada',
    meta: 'GPT-4o vs Claude · 3 prompts',
    time: '15 min',
  },
  {
    id: '4', type: 'project',
    label: 'Projeto atualizado',
    meta: 'Marketing Campaign 2024',
    time: '1 h',
  },
];

const activityColors: Record<ActivityItem['type'], string> = {
  prompt:     'var(--primary)',
  project:    'var(--secondary)',
  run:        'var(--success)',
  comparison: 'var(--warning)',
};

// ─── CommandCenter ────────────────────────────────────────────────────────────

export function CommandCenter() {
  const { setView } = usePromptStore();
  const [inputFocused, setInputFocused] = useState(false);
  const [inputValue, setInputValue]     = useState('');

  const heroActions = [
    { label: 'Build a Prompt',      icon: Wand2,      view: 'builder' as const },
    { label: 'Open Canvas',         icon: GitBranch,  view: 'canvas'   as const },
    { label: 'Explore Studios',     icon: Sparkles,   view: 'studio-image' as const },
    { label: 'Continue Project',    icon: FolderOpen, view: 'projects' as const },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 32px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={{ position: 'relative' }}>
        {/* Soft glow behind hero */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '200px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(128,103,255,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', textAlign: 'center', paddingTop: '24px', paddingBottom: '8px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '36px',
              fontWeight: 700,
              color: 'var(--foreground)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Welcome to Prompt Forge.
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--muted)',
              margin: 0,
              marginBottom: '28px',
            }}
          >
            Your intelligence workspace is ready.
          </p>

          {/* Main search / create input */}
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto 24px',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'var(--surface-elevated)',
                border: `1px solid ${inputFocused ? 'var(--primary)' : 'var(--border-strong)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: '12px 16px',
                transition: 'border-color 200ms ease',
                boxShadow: inputFocused ? '0 0 0 3px var(--primary-subtle)' : 'none',
              }}
            >
              <Wand2 size={16} style={{ color: inputFocused ? 'var(--primary)' : 'var(--muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="What do you want to create today?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    setView('builder');
                  }
                }}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              {inputValue && (
                <button
                  onClick={() => setView('builder')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <ArrowRight size={12} />
                  Criar
                </button>
              )}
            </div>
          </div>

          {/* Hero action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {heroActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.view}
                  onClick={() => setView(a.view)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--foreground-secondary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = 'var(--surface-hover)';
                    el.style.borderColor = 'var(--primary)';
                    el.style.color = 'var(--foreground)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = 'var(--surface-elevated)';
                    el.style.borderColor = 'var(--border)';
                    el.style.color = 'var(--foreground-secondary)';
                  }}
                >
                  <Icon size={14} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Intelligence Overview</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
          }}
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Icon size={14} style={{ color: 'var(--primary)' }} />
                  {s.trend && (
                    <span style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <TrendingUp size={10} />
                      {s.trend}
                    </span>
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: s.value === '—' ? 'var(--border-strong)' : 'var(--foreground)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      marginBottom: '4px',
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <section>
        <SectionLabel>Quick Actions</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                onClick={() => setView(qa.view as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 150ms ease, border-color 150ms ease, transform 150ms ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = 'var(--surface-hover)';
                  el.style.borderColor = 'var(--border-strong)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.backgroundColor = 'var(--surface-elevated)';
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: `color-mix(in srgb, ${qa.color} 15%, transparent)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} style={{ color: qa.color }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground-secondary)' }}>
                  {qa.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Bottom split: Recent Projects + Activity Feed ─────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Recent Projects */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionLabel noMargin>Recent Projects</SectionLabel>
            <button
              onClick={() => setView('projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)')}
            >
              Ver todos
              <ArrowRight size={11} />
            </button>
          </div>

          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Empty state */}
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--primary-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground-secondary)', marginBottom: '4px' }}>
                  Sem projetos ainda
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Os teus projetos recentes aparecerão aqui.
                </div>
              </div>
              <button
                onClick={() => setView('builder')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: 'var(--primary-subtle)',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--primary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                <Plus size={12} />
                Criar primeiro prompt
              </button>
            </div>
          </div>
        </section>

        {/* Activity Feed */}
        <section>
          <SectionLabel noMargin style={{ marginBottom: '12px' }}>Activity Feed</SectionLabel>
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            {activity.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: activityColors[item.type],
                    marginTop: '5px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--foreground-secondary)',
                      fontWeight: 500,
                      marginBottom: '2px',
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.meta}</div>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Clock size={10} />
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function SectionLabel({
  children,
  noMargin,
  style: extraStyle,
}: {
  children: React.ReactNode;
  noMargin?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <h2
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.07em',
        color: 'var(--muted)',
        textTransform: 'uppercase',
        margin: 0,
        marginBottom: noMargin ? 0 : '12px',
        ...extraStyle,
      }}
    >
      {children}
    </h2>
  );
}
