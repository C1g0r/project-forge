import { usePromptStore } from '../../store/usePromptStore';
import {
  ChevronRight,
  Clock,
  Maximize2,
  Command,
} from 'lucide-react';
import type { AppView } from '../../types';

// ─── Breadcrumb mapping ───────────────────────────────────────────────────────

const viewLabels: Partial<Record<AppView, string[]>> = {
  home:              ['Workspace'],
  builder:           ['Workspace', 'Prompt Builder'],
  canvas:            ['Workspace', 'Canvas'],
  projects:          ['Workspace', 'Projects'],
  library:           ['Workspace', 'Library'],
  favorites:         ['Workspace', 'Favorites'],
  'studio-image':    ['Studios', 'Image'],
  'studio-video':    ['Studios', 'Video'],
  'studio-music':    ['Studios', 'Music'],
  'studio-text':     ['Studios', 'Text'],
  'studio-code':     ['Studios', 'Code'],
  'studio-3d':       ['Studios', '3D / Design'],
  'studio-business': ['Studios', 'Business'],
  'studio-automation': ['Studios', 'Automation'],
  'studio-science':  ['Studios', 'Science'],
  'studio-gamedev':  ['Studios', 'Game Dev'],
  'studio-voice':    ['Studios', 'Voice'],
  'studio-universal': ['Studios', 'Universal'],
  lab:               ['Intelligence', 'Prompt Lab'],
  comparison:        ['Intelligence', 'Comparison'],
  knowledge:         ['Intelligence', 'Knowledge'],
  workflow:          ['Intelligence', 'Workflow Builder'],
  analytics:         ['Intelligence', 'Analytics'],
  providers:         ['AI Control', 'Providers'],
  models:            ['AI Control', 'Models'],
  'api-config':      ['AI Control', 'API Keys'],
  'local-models':    ['AI Control', 'Local Models'],
  usage:             ['AI Control', 'Usage & Costs'],
  settings:          ['System', 'Settings'],
  appearance:        ['System', 'Appearance'],
  shortcuts:         ['System', 'Shortcuts'],
  security:          ['System', 'Security'],
  docs:              ['System', 'Docs'],
  output:            ['Workspace', 'Output'],
};

// ─── WorkspaceHeader ──────────────────────────────────────────────────────────

export function WorkspaceHeader() {
  const { view } = usePromptStore();

  const crumbs = viewLabels[view] ?? ['Workspace'];

  return (
    <header
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '20px',
        paddingRight: '12px',
        gap: '8px',
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
      }}
    >
      {/* ── Breadcrumb ──────────────────────────────────────── */}
      <nav className="flex items-center gap-1 flex-1 overflow-hidden">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                size={12}
                style={{ color: 'var(--muted)', flexShrink: 0 }}
              />
            )}
            <span
              style={{
                fontSize: '13px',
                fontWeight: i === crumbs.length - 1 ? 500 : 400,
                color: i === crumbs.length - 1 ? 'var(--foreground)' : 'var(--muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      {/* ── Action strip ────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Command palette hint */}
        <HeaderButton title="Command Palette  ⌘K">
          <Command size={14} />
        </HeaderButton>

        {/* History */}
        <HeaderButton title="Histórico de sessões">
          <Clock size={14} />
        </HeaderButton>

        {/* Focus mode */}
        <HeaderButton title="Modo foco">
          <Maximize2 size={14} />
        </HeaderButton>
      </div>
    </header>
  );
}

// ─── Tiny icon button ─────────────────────────────────────────────────────────

interface HeaderButtonProps {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}

function HeaderButton({ title, onClick, children }: HeaderButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'var(--muted)',
        cursor: 'pointer',
        transition: 'background-color 150ms ease, color 150ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.backgroundColor = 'var(--surface-hover)';
        el.style.color = 'var(--foreground)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.backgroundColor = 'transparent';
        el.style.color = 'var(--muted)';
      }}
    >
      {children}
    </button>
  );
}
