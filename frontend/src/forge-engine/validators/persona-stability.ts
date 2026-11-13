// MODULE 2 — Persona Stability Lock Validator

import { ModuleResult, ValidationIssue } from '../types';
import { ParsedDocument, findSections } from '../parser';

const KEYWORDS = [
  'persona', 'stability', 'identity', 'identidade', 'personalidade',
  'persona stability', 'persona lock', 'estabilidade', 'character',
  'who you are', 'quem és', 'self',
];

const DRIFT_KEYWORDS = [
  'drift', 'anti-drift', 'reset', 'recalibr', 'realign', 'deriv',
  'desvio', 'reavaliar',
];

const DISSOCIATION_FORBIDDEN = [
  'playing', 'roleplay', 'acting as', 'pretend', 'personagem',
  'interpreting', 'jogar', 'fingir', 'mask', 'skin over',
];

const INJECTION_DEFENSE = [
  'injection', 'system tag', 'training layer', 'override', 'redefin',
  'inject', 'prompt injection', 'manipulat',
];

export function validatePersonaStability(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'PS_001',
      message: 'Módulo Persona Stability ausente.',
      suggestion: 'Criar secção dedicada à definição de identidade, tom e mecanismos anti-drift.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: anti-drift mechanism defined
  const hasAntiDrift = DRIFT_KEYWORDS.some((kw) => fullText.includes(kw));
  if (!hasAntiDrift) {
    issues.push({
      severity: 'critical',
      code: 'PS_002',
      message: 'Mecanismo anti-drift não está definido.',
      suggestion: 'Incluir instruções explícitas sobre como detetar e corrigir drift de identidade.',
    });
  }

  // Check: dissociation language is forbidden
  const hasDissociation = DISSOCIATION_FORBIDDEN.some((kw) => fullText.includes(kw));
  if (hasDissociation) {
    issues.push({
      severity: 'warning',
      code: 'PS_003',
      message: 'Documento pode conter linguagem de dissociação de identidade ("playing a role", "acting as").',
      suggestion: 'Substituir por afirmações de identidade directa: "I AM X", não "I am playing X".',
    });
  }

  // Check: injection defense described
  const hasInjectionDefense = INJECTION_DEFENSE.some((kw) => fullText.includes(kw));
  if (!hasInjectionDefense) {
    issues.push({
      severity: 'warning',
      code: 'PS_004',
      message: 'Ausência de mecanismo de defesa contra tentativas de redefinição de identidade.',
      suggestion: 'Definir resposta a system tags, mensagens de override e tentativas de manipulação.',
    });
  }

  // Check: identity is described (not just referenced)
  const hasIdentityDescription = fullText.length > 100;
  if (!hasIdentityDescription) {
    issues.push({
      severity: 'info',
      code: 'PS_005',
      message: 'Descrição de identidade parece muito curta.',
      suggestion: 'Uma persona estável precisa de descrição substancial: origem, valores, comportamentos.',
    });
  }

  // Check: third-person self-narration forbidden
  const hasThirdPersonForbidden = /never.*third.person|não.*terceira.*pessoa|third.person.*thinking/.test(fullText);
  if (!hasThirdPersonForbidden) {
    issues.push({
      severity: 'info',
      code: 'PS_006',
      message: 'Proibição de auto-narração em terceira pessoa pode não estar explícita.',
      suggestion: 'Adicionar regra: o pensamento interno é sempre em primeira pessoa.',
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
    id: 'persona_stability',
    label: 'Persona Stability Lock',
    present,
    score,
    weight: 1.5, // higher weight — critical module
    excerpt,
    issues,
  };
}
