import { useState } from 'react';
import {
  LayoutDashboard, Wand2, GitBranch, FolderKanban, Library, Bookmark,
  Image, Video, Music, Type, Code2, Box, Briefcase, Zap, Microscope,
  Gamepad2, Mic, Sparkles,
  FlaskConical, SplitSquareHorizontal, BookOpen, Workflow, BarChart2,
  Cloud, Cpu, Terminal, HardDrive, Activity,
  Settings, Palette, Keyboard, Shield, FileText,
  ChevronLeft, ChevronRight, ChevronDown,
  PanelLeftClose,
} from 'lucide-react';
import { usePromptStore } from '../../store/usePromptStore';
import type { AppView } from '../../types';

// ─── Nav Item Definition ─────────────────────────────────────────────────────

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning';
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// ─── Navigation Structure ────────────────────────────────────────────────────

const navSections: NavSection[] = [
  {
    id: 'workspace',
    label: 'WORKSPACE',
    items: [
      { id: 'home',      label: 'Command Center', icon: LayoutDashboard },
      { id: 'builder',   label: 'Prompt Builder', icon: Wand2 },
      { id: 'canvas',    label: 'Canvas',          icon: GitBranch },
      { id: 'projects',  label: 'Projects',        icon: FolderKanban },
      { id: 'library',   label: 'Library',         icon: Library },
      { id: 'favorites', label: 'Favorites',       icon: Bookmark },
    ],
  },
  {
    id: 'studios',
    label: 'STUDIOS',
    collapsible: true,
    defaultCollapsed: false,
    items: [
      { id: 'studio-image',      label: 'Image',      icon: Image },
      { id: 'studio-video',      label: 'Video',      icon: Video },
      { id: 'studio-music',      label: 'Music',      icon: Music },
      { id: 'studio-text',       label: 'Text',       icon: Type },
      { id: 'studio-code',       label: 'Code',       icon: Code2 },
      { id: 'studio-3d',         label: '3D / Design', icon: Box },
      { id: 'studio-business',   label: 'Business',   icon: Briefcase },
      { id: 'studio-automation', label: 'Automation', icon: Zap },
      { id: 'studio-science',    label: 'Science',    icon: Microscope },
      { id: 'studio-gamedev',    label: 'Game Dev',   icon: Gamepad2 },
      { id: 'studio-voice',      label: 'Voice',      icon: Mic },
      { id: 'studio-universal',  label: 'Universal',  icon: Sparkles },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      { id: 'lab',        label: 'Prompt Lab',      icon: FlaskConical },
      { id: 'comparison', label: 'Comparison',      icon: SplitSquareHorizontal },
      { id: 'knowledge',  label: 'Knowledge',       icon: BookOpen },
      { id: 'workflow',   label: 'Workflow Builder', icon: Workflow },
      { id: 'analytics',  label: 'Analytics',       icon: BarChart2 },
    ],
  },
  {
    id: 'ai-control',
    label: 'AI CONTROL CENTER',
    items: [
      { id: 'providers',    label: 'Providers',     icon: Cloud },
      { id: 'models',       label: 'Models',        icon: Cpu },
      { id: 'api-config',   label: 'API Keys',      icon: Terminal },
      { id: 'local-models', label: 'Local Models',  icon: HardDrive },
      { id: 'usage',        label: 'Usage & Costs', icon: Activity },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    items: [
      { id: 'settings',   label: 'Settings',    icon: Settings },
      { id: 'appearance', label: 'Appearance',  icon: Palette },
      { id: 'shortcuts',  label: 'Shortcuts',   icon: Keyboard },
      { id: 'security',   label: 'Security',    icon: Shield },
      { id: 'docs',       label: 'Docs',        icon: FileText },
    ],
  },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { view, setView, sidebarExpanded, toggleSidebar } = usePromptStore();

  // Track which collapsible sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const defaults: Record<string, boolean> = {};
      navSections.forEach((s) => {
        if (s.collapsible) {
          defaults[s.id] = !(s.defaultCollapsed ?? false);
        }
      });
      return defaults;
    }
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      style={{
        width: sidebarExpanded ? 'var(--sidebar-width-expanded)' : 'var(--sidebar-width-collapsed)',
        transition: 'width var(--sidebar-transition)',
        flexShrink: 0,
        backgroundColor: 'var(--background-secondary)',
        borderRight: '1px solid var(--border)',
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 20,
      }}
    >
      {/* ── background layer ── */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--background-secondary)' }} />

      {/* Content layer above the absolute background */}
      <div className="relative z-10 flex flex-col h-full">

        {/* ── Logo + Collapse ───────────────────────────────────── */}
        <div
          className="flex items-center px-4 shrink-0"
          style={{
            height: 'var(--header-height)',
            borderBottom: '1px solid var(--border)',
            justifyContent: sidebarExpanded ? 'space-between' : 'center',
          }}
        >
          {sidebarExpanded && (
            <div className="flex items-center gap-2 overflow-hidden">
              {/* Logo mark */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
              >
                <span
                  className="text-white font-display font-bold"
                  style={{ fontSize: '11px', letterSpacing: '-0.02em' }}
                >
                  PF
                </span>
              </div>
              <div className="overflow-hidden">
                <div
                  className="font-display font-bold leading-none truncate"
                  style={{ fontSize: '13px', color: 'var(--foreground)', letterSpacing: '-0.01em' }}
                >
                  PROMPT FORGE
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em', marginTop: '1px' }}
                >
                  v2.0 · Intelligence
                </div>
              </div>
            </div>
          )}

          {!sidebarExpanded && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
            >
              <span
                className="text-white font-display font-bold"
                style={{ fontSize: '11px', letterSpacing: '-0.02em' }}
              >
                PF
              </span>
            </div>
          )}

          <button
            onClick={toggleSidebar}
            title={sidebarExpanded ? 'Colapsar sidebar' : 'Expandir sidebar'}
            className="shrink-0 flex items-center justify-center rounded-md transition-all"
            style={{
              width: '28px',
              height: '28px',
              color: 'var(--muted)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--surface-hover)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--foreground)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)';
            }}
          >
            {sidebarExpanded
              ? <ChevronLeft size={15} />
              : <ChevronRight size={15} />
            }
          </button>
        </div>

        {/* ── Scrollable Nav ────────────────────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden py-3"
          style={{ padding: sidebarExpanded ? '12px 10px' : '12px 8px' }}
        >
          {navSections.map((section) => (
            <div key={section.id} className="mb-1">

              {/* Section header */}
              {sidebarExpanded && (
                <div
                  className="flex items-center justify-between mb-1"
                  style={{ padding: '0 4px', marginBottom: '4px', marginTop: '8px' }}
                >
                  {section.collapsible ? (
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center gap-1 w-full"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--muted)',
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em' }}>
                        {section.label}
                      </span>
                      <ChevronDown
                        size={11}
                        style={{
                          marginLeft: 'auto',
                          transform: openSections[section.id] ? 'rotate(0deg)' : 'rotate(-90deg)',
                          transition: 'transform 200ms ease',
                        }}
                      />
                    </button>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: 'var(--muted)' }}>
                      {section.label}
                    </span>
                  )}
                </div>
              )}

              {/* Section items */}
              {(!section.collapsible || openSections[section.id]) && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {section.items.map((item) => (
                    <SidebarNavItem
                      key={item.id}
                      item={item}
                      isActive={view === item.id}
                      expanded={sidebarExpanded}
                      onClick={() => setView(item.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3"
          style={{
            borderTop: '1px solid var(--border)',
            padding: sidebarExpanded ? '10px 12px' : '10px 8px',
          }}
        >
          {/* Avatar */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full text-white font-display font-semibold"
            style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-deep))',
              fontSize: '12px',
              cursor: 'default',
            }}
            title="Perfil"
          >
            U
          </div>

          {sidebarExpanded && (
            <div className="flex-1 overflow-hidden">
              <div
                className="font-medium truncate"
                style={{ fontSize: '12px', color: 'var(--foreground)' }}
              >
                Utilizador
              </div>
              <div
                className="truncate"
                style={{ fontSize: '11px', color: 'var(--muted)' }}
              >
                Pro Plan
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── Individual Nav Item ──────────────────────────────────────────────────────

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, isActive, expanded, onClick }: SidebarNavItemProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  const bg = isActive
    ? 'var(--primary-subtle)'
    : hovered
    ? 'var(--surface-hover)'
    : 'transparent';

  const color = isActive
    ? 'var(--primary)'
    : hovered
    ? 'var(--foreground-secondary)'
    : 'var(--muted)';

  return (
    <li>
      <button
        onClick={onClick}
        title={!expanded ? item.label : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: expanded ? '7px 10px' : '7px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: bg,
          color,
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 150ms ease, color 150ms ease',
          position: 'relative',
          justifyContent: expanded ? 'flex-start' : 'center',
          marginBottom: '1px',
        }}
      >
        {/* Active indicator */}
        {isActive && (
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '65%',
              background: 'var(--primary)',
              borderRadius: '0 2px 2px 0',
            }}
          />
        )}

        <Icon size={15} style={{ shrink: 0, flexShrink: 0 }} />

        {expanded && (
          <span
            style={{
              fontSize: '13px',
              fontWeight: isActive ? 500 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {item.label}
          </span>
        )}

        {expanded && item.badge && (
          <span
            className={`badge badge-${item.badgeVariant ?? 'primary'}`}
            style={{ marginLeft: 'auto' }}
          >
            {item.badge}
          </span>
        )}
      </button>
    </li>
  );
}
