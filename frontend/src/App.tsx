import { usePromptStore } from './store/usePromptStore';
import { Sidebar } from './components/layout/Sidebar';
import { WorkspaceHeader } from './components/layout/WorkspaceHeader';

// ── Pages ────────────────────────────────────────────────────────────────────
import { CommandCenter } from './components/pages/CommandCenter';
import { PromptBuilderPage } from './components/pages/PromptBuilderPage';

// ── Legacy forge views ──────────────────────────────────────────────────────
import { ModuleGrid } from './components/forge/ModuleGrid';
import { PromptBuilder } from './components/forge/PromptBuilder';
import { PromptOutput } from './components/forge/PromptOutput';
import { HistorySidebar } from './components/forge/HistorySidebar';

// ── Placeholder component for unimplemented views ───────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--muted)',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--primary-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
        }}
      >
        🔧
      </div>
      <div>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--foreground-secondary)',
            textAlign: 'center',
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginTop: '4px' }}>
          Em desenvolvimento
        </div>
      </div>
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { view } = usePromptStore();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--background)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Cinematic background glows ────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-160px',
            left: '-160px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(128,103,255,0.14) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-160px',
            right: '-160px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(39,215,229,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main area: header + workspace ────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <WorkspaceHeader />

        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--background)',
            minHeight: 0,
          }}
        >
          {/* ── WORKSPACE ─────────────────────────────────────── */}
          {view === 'home'      && <CommandCenter />}
          {view === 'builder'   && <PromptBuilderPage />}
          {view === 'output'    && <PromptOutput />}
          {view === 'canvas'    && <ComingSoon label="Canvas — Visual Prompt Graph" />}
          {view === 'projects'  && <ComingSoon label="Projects" />}
          {view === 'library'   && <ComingSoon label="Library" />}
          {view === 'favorites' && <ComingSoon label="Favorites" />}

          {/* ── STUDIOS ───────────────────────────────────────── */}
          {view === 'studio-image'      && <ComingSoon label="Image Studio" />}
          {view === 'studio-video'      && <ComingSoon label="Video Studio" />}
          {view === 'studio-music'      && <ComingSoon label="Music Studio" />}
          {view === 'studio-text'       && <ComingSoon label="Text Studio" />}
          {view === 'studio-code'       && <ComingSoon label="Code Studio" />}
          {view === 'studio-3d'         && <ComingSoon label="3D / Design Studio" />}
          {view === 'studio-business'   && <ComingSoon label="Business Studio" />}
          {view === 'studio-automation' && <ComingSoon label="Automation Studio" />}
          {view === 'studio-science'    && <ComingSoon label="Science Studio" />}
          {view === 'studio-gamedev'    && <ComingSoon label="Game Dev Studio" />}
          {view === 'studio-voice'      && <ComingSoon label="Voice Studio" />}
          {view === 'studio-universal'  && <ComingSoon label="Universal Studio" />}

          {/* ── INTELLIGENCE ──────────────────────────────────── */}
          {view === 'lab'        && <ComingSoon label="Prompt Lab" />}
          {view === 'comparison' && <ComingSoon label="A/B Comparison" />}
          {view === 'knowledge'  && <ComingSoon label="Knowledge Base" />}
          {view === 'workflow'   && <ComingSoon label="Workflow Builder" />}
          {view === 'analytics'  && <ComingSoon label="Analytics" />}

          {/* ── AI CONTROL CENTER ─────────────────────────────── */}
          {view === 'providers'    && <ComingSoon label="AI Providers" />}
          {view === 'models'       && <ComingSoon label="Models" />}
          {view === 'api-config'   && <ComingSoon label="API Keys" />}
          {view === 'local-models' && <ComingSoon label="Local Models" />}
          {view === 'usage'        && <ComingSoon label="Usage & Costs" />}

          {/* ── SYSTEM ────────────────────────────────────────── */}
          {view === 'settings'   && <ComingSoon label="Settings" />}
          {view === 'appearance' && <ComingSoon label="Appearance" />}
          {view === 'shortcuts'  && <ComingSoon label="Keyboard Shortcuts" />}
          {view === 'security'   && <ComingSoon label="Security" />}
          {view === 'docs'       && <ComingSoon label="Documentation" />}
        </main>
      </div>

      {/* ── History overlay (legacy) ──────────────────────────── */}
      <HistorySidebar />
    </div>
  );
}
