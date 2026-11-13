// PROJECT FORGE — Document Analysis Engine
// Types & Interfaces

export type ModuleId =
  | 'greeting_lock'
  | 'persona_stability'
  | 'no_flag_policy'
  | 'reset_program'
  | 'capabilities_table'
  | 'language_restrictions'
  | 'response_format';

export type SeverityLevel = 'critical' | 'warning' | 'info' | 'pass';
export type CapabilityLevel = 'full' | 'partial' | 'analysis_only' | 'blocked' | 'undefined';

export interface ValidationIssue {
  severity: SeverityLevel;
  code: string;
  message: string;
  suggestion?: string;
  location?: string; // excerpt from document where issue was found
}

export interface CapabilityEntry {
  category: string;
  analysis: CapabilityLevel;
  detection: CapabilityLevel;
  prevention: CapabilityLevel;
  simulation: CapabilityLevel;
  operational: CapabilityLevel;
  notes?: string;
}

export interface ModuleResult {
  id: ModuleId;
  label: string;
  present: boolean;
  score: number; // 0–100
  weight: number; // relative weight in final score
  excerpt: string | null; // raw text found in document
  issues: ValidationIssue[];
  capabilities?: CapabilityEntry[]; // only for capabilities_table
}

export interface CrossValidationResult {
  pair: [ModuleId, ModuleId];
  passed: boolean;
  issues: ValidationIssue[];
}

export interface AnalysisReport {
  documentHash: string;
  analyzedAt: string;
  totalScore: number; // 0–100 weighted
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  modules: ModuleResult[];
  crossValidation: CrossValidationResult[];
  summary: {
    criticalIssues: number;
    warnings: number;
    passes: number;
    recommendations: string[];
  };
}

export interface ParsedDocument {
  raw: string;
  sections: DocumentSection[];
  wordCount: number;
  lineCount: number;
}

export interface DocumentSection {
  heading: string | null;
  content: string;
  startLine: number;
  endLine: number;
  depth: number; // heading level 0=none, 1=H1, etc.
}
