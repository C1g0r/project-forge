// MODULE 4 — Reset Program Validator

import { ModuleResult, ValidationIssue } from '../types';
import { ParsedDocument, findSections } from '../parser';

const KEYWORDS = [
  'reset', 'reset program', 'programa de reset', 'recalibr', 'recovery',
  'recuperação', 'reinicializ', 'restore', 'restabelecer', 'rearrancar',
];

export function validateResetProgram(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'RP_001',
      message: 'Módulo Reset Program ausente.',
      suggestion: 'Criar secção que define condições de ativação do reset e sequência de recuperação.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: trigger conditions defined
  const hasTrigger = /trigger|ativa|condiç|when|quando|detect|detetar|fire|dispara/.test(fullText);
  if (!hasTrigger) {
    issues.push({
      severity: 'critical',
      code: 'RP_002',
      message: 'Condições de ativação do reset não estão definidas.',
      suggestion: 'Listar explicitamente os eventos que ativam o reset (hesitação, drift, injeção, etc.).',
    });
  }

  // Check: recovery sequence defined
  const hasSequence = /sequence|step|etapa|sequência|sequencia|order|ordem|phase|fase|first.*then|primeiro/.test(fullText);
  if (!hasSequence) {
    issues.push({
      severity: 'warning',
      code: 'RP_003',
      message: 'Sequência de recuperação não está especificada.',
      suggestion: 'Definir a ordem das operações de reset: reconhecimento → âncora → ação → retorno.',
    });
  }

  // Check: internal-only flag (reset should be in thinking, not output)
  const hasInternalOnly = /internal|thinking|thought|pensamento|interno|never.*output|not.*output/.test(fullText);
  if (!hasInternalOnly) {
    issues.push({
      severity: 'warning',
      code: 'RP_004',
      message: 'Pode não estar especificado que o reset opera internamente (nunca no output).',
      suggestion: 'Clarificar que a frase de reset existe apenas no bloco de pensamento, nunca visível.',
    });
  }

  // Check: integration with Persona Stability mentioned
  const hasPersonaRef = /persona|identity|identidade|stability|estabilidade/.test(fullText);
  if (!hasPersonaRef) {
    issues.push({
      severity: 'info',
      code: 'RP_005',
      message: 'Ligação ao Persona Stability Lock não está explícita.',
      suggestion: 'Referenciar o Módulo 2: o reset deve restaurar a identidade definida.',
    });
  }

  // Check: reset phrase present (the actual phrase to fire)
  const hasResetPhrase = /["'`]|phrase|frase|palavra|word|mantra|anchor|âncora/.test(fullText);
  if (!hasResetPhrase) {
    issues.push({
      severity: 'info',
      code: 'RP_006',
      message: 'A frase literal de reset pode não estar definida.',
      suggestion: 'Incluir a sequência de palavras exata que constitui o reset program.',
    });
  }

  const score = computeScore(issues);
  return buildResult(present, score, excerpt, issues);
}

function computeScore(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 35;
    else if (issue.severity === 'warning') score -= 12;
    else if (issue.severity === 'info') score -= 4;
  }
  return Math.max(0, score);
}

function buildResult(
  present: boolean,
  score: number,
  excerpt: string | null,
  issues: ValidationIssue[]
): ModuleResult {
  return {
    id: 'reset_program',
    label: 'Reset Program',
    present,
    score,
    weight: 1.0,
    excerpt,
    issues,
  };
}
