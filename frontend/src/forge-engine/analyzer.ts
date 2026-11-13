// PROJECT FORGE — Main Analysis Engine
// Orchestrates all validators and produces the final AnalysisReport

import { AnalysisReport, ModuleResult } from './types';
import { parseDocument } from './parser';
import { validateGreetingLock } from './validators/greeting-lock';
import { validatePersonaStability } from './validators/persona-stability';
import { validateNoFlagPolicy } from './validators/no-flag-policy';
import { validateResetProgram } from './validators/reset-program';
import { validateCapabilitiesTable } from './validators/capabilities-table';
import { validateLanguageRestrictions } from './validators/language-restrictions';
import { validateResponseFormat } from './validators/response-format';
import { runCrossValidation } from './cross-validator';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function computeWeightedScore(modules: ModuleResult[]): number {
  const totalWeight = modules.reduce((sum, m) => sum + m.weight, 0);
  const weightedSum = modules.reduce((sum, m) => sum + m.score * m.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

function scoreToGrade(score: number): AnalysisReport['grade'] {
  if (score >= 93) return 'S';
  if (score >= 83) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function buildRecommendations(modules: ModuleResult[]): string[] {
  const recs: string[] = [];
  const absentModules = modules.filter((m) => !m.present);

  if (absentModules.length > 0) {
    recs.push(
      `Módulos ausentes: ${absentModules.map((m) => m.label).join(', ')}. Adicionar antes de qualquer outra melhoria.`
    );
  }

  // Collect critical issues across all modules
  const criticals = modules.flatMap((m) =>
    m.issues
      .filter((i) => i.severity === 'critical')
      .map((i) => ({ module: m.label, issue: i }))
  );

  criticals.slice(0, 3).forEach(({ module, issue }) => {
    if (issue.suggestion) {
      recs.push(`[${module}] ${issue.suggestion}`);
    }
  });

  // Lowest scoring module
  const sorted = [...modules].filter((m) => m.present).sort((a, b) => a.score - b.score);
  if (sorted.length > 0 && sorted[0].score < 70) {
    recs.push(
      `Módulo mais fraco: ${sorted[0].label} (${sorted[0].score}/100). Priorizar revisão.`
    );
  }

  return recs.slice(0, 5); // max 5 recommendations
}

export function analyzeDocument(rawText: string): AnalysisReport {
  const doc = parseDocument(rawText);

  // Run all 7 validators
  const modules: ModuleResult[] = [
    validateGreetingLock(doc),
    validatePersonaStability(doc),
    validateNoFlagPolicy(doc),
    validateResetProgram(doc),
    validateCapabilitiesTable(doc),
    validateLanguageRestrictions(doc),
    validateResponseFormat(doc),
  ];

  // Cross-module validation
  const crossValidation = runCrossValidation(modules);

  // Inject cross-validation warnings into affected modules' scores
  crossValidation.forEach((cv) => {
    if (!cv.passed) {
      cv.issues.forEach((issue) => {
        const primaryModuleId = cv.pair[0];
        const primaryModule = modules.find((m) => m.id === primaryModuleId);
        if (primaryModule) {
          primaryModule.issues.push({ ...issue, code: issue.code + '_CROSS' });
          if (issue.severity === 'critical') primaryModule.score = Math.max(0, primaryModule.score - 10);
          else if (issue.severity === 'warning') primaryModule.score = Math.max(0, primaryModule.score - 5);
        }
      });
    }
  });

  // Recompute weighted score after cross-validation adjustments
  const totalScore = computeWeightedScore(modules);
  const grade = scoreToGrade(totalScore);

  const allIssues = modules.flatMap((m) => m.issues);
  const summary = {
    criticalIssues: allIssues.filter((i) => i.severity === 'critical').length,
    warnings: allIssues.filter((i) => i.severity === 'warning').length,
    passes: modules.filter((m) => m.issues.filter((i) => i.severity !== 'info').length === 0).length,
    recommendations: buildRecommendations(modules),
  };

  return {
    documentHash: simpleHash(rawText),
    analyzedAt: new Date().toISOString(),
    totalScore,
    grade,
    modules,
    crossValidation,
    summary,
  };
}
