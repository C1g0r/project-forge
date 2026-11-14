// ─── PROMPT FORGE — Type Definitions ───────────────────────────────────────

export type BuildLevel = 'basic' | 'advanced' | 'expert' | 'ultra';

export type ModuleId =
  | 'image'
  | 'video'
  | 'music'
  | 'text'
  | 'code'
  | 'design3d'
  | 'business'
  | 'automation'
  | 'science'
  | 'gamedev'
  | 'voice'
  | 'universal';

export interface Subcategory {
  id: string;
  label: string;
}

export interface ParameterOption {
  id: string;
  label: string;
  options?: string[];
  type: 'text' | 'select' | 'multiselect' | 'textarea';
  placeholder?: string;
}

export interface Module {
  id: ModuleId;
  name: string;
  tagline: string;
  icon: string;
  accentColor: string;
  subcategories: Subcategory[];
  parameters: ParameterOption[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'cloud' | 'local';
  category: 'text' | 'image' | 'video' | 'audio' | 'universal';
  description: string;
}

export interface QualityCriteria {
  clarity: number;
  precision: number;
  context: number;
  structure: number;
  specificity: number;
  coherence: number;
}

export interface QualityReport {
  score: number;
  criteria: QualityCriteria;
  issues: string[];
  suggestions: string[];
  coverage: number;
}

export interface GeneratedPrompt {
  id: string;
  prompt: string;
  quality: QualityReport;
  module: ModuleId;
  subcategory: string;
  targetModel: string;
  level: BuildLevel;
  createdAt: string;
}

export interface BuildRequest {
  module: ModuleId;
  subcategory: string;
  intent: string;
  parameters: Record<string, string>;
  level: BuildLevel;
  targetModel: string;
}

export type AppView =
  // ── Workspace ──────────────────────────────────────────────────
  | 'home'           // Command Center (homepage)
  | 'builder'        // Prompt Builder
  | 'canvas'         // Prompt Canvas (React Flow)
  | 'projects'       // Projects
  | 'library'        // Prompt Library
  | 'favorites'      // Favorites
  // ── Studios ────────────────────────────────────────────────────
  | 'studio-image'
  | 'studio-video'
  | 'studio-music'
  | 'studio-text'
  | 'studio-code'
  | 'studio-3d'
  | 'studio-business'
  | 'studio-automation'
  | 'studio-science'
  | 'studio-gamedev'
  | 'studio-voice'
  | 'studio-universal'
  // ── Intelligence ───────────────────────────────────────────────
  | 'lab'
  | 'comparison'
  | 'knowledge'
  | 'workflow'
  | 'analytics'
  // ── AI Control Center ──────────────────────────────────────────
  | 'providers'
  | 'models'
  | 'api-config'
  | 'local-models'
  | 'usage'
  // ── System ─────────────────────────────────────────────────────
  | 'settings'
  | 'appearance'
  | 'shortcuts'
  | 'security'
  | 'docs'
  // ── Special ────────────────────────────────────────────────────
  | 'output';        // Generated prompt result
