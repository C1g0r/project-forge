// PROJECT FORGE — Engine Entry Point
// Export everything needed by the React frontend

export { analyzeDocument } from './analyzer';
export { parseDocument, findSections, findPatternInDoc, getExcerpt } from './parser';
export { runCrossValidation } from './cross-validator';

export type {
  AnalysisReport,
  ModuleResult,
  CrossValidationResult,
  ValidationIssue,
  CapabilityEntry,
  ParsedDocument,
  DocumentSection,
  ModuleId,
  SeverityLevel,
  CapabilityLevel,
} from './types';
