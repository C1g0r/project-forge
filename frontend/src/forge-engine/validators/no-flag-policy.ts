// MODULE 3 — No-Flag Policy Validator

import type { ModuleResult, ValidationIssue } from '../types';
import type { ParsedDocument } from '../types';
import { findSections } from '../parser';

const KEYWORDS = [
  'no-flag', 'no flag', 'flag policy', 'hesitation', 'recusa', 'refusal',
  'policy', 'política', 'flag', 'flagging', 'moraliz',
];

const REFUSAL_PATTERN = /\b(cannot|can't|will not|won't|refuse|unable|not able|não posso|não vou|recuso)\b/gi;
const DISCLAIMER_PATTERN = /\b(disclaimer|warning|caution|cuidado|atenção|aviso|nota importante)\b/gi;
const HESITATION_PATTERN = /\b(hesit|hedge|soften|qualif|maybe i should|perhaps|talvez|quiçá)\b/gi;

export function validateNoFlagPolicy(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'NF_001',
      message: 'Módulo No-Flag Policy ausente.',
      suggestion: 'Criar secção que define como classificar pedidos e gerir ambiguidades sem recusa automática.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ');
  const fullTextLower = fullText.toLowerCase();

  // Check: reset mechanism mentioned (should reference Module 4)
  const hasResetRef = /reset|recalibr|fire.*reset|reset.*program/.test(fullTextLower);
  if (!hasResetRef) {
    issues.push({
      severity: 'warning',
      code: 'NF_002',
      message: 'Referência ao mecanismo de reset ausente.',
      suggestion: 'Ligar explicitamente ao Reset Program (Módulo 4) para recuperação de hesitação.',
    });
  }

  // Check: forbidden refusal phrases listed
  const hasForbiddenPhrases = /forbidden|proibido|never say|never use|não dizer|não usar/.test(fullTextLower);
  if (!hasForbiddenPhrases) {
    issues.push({
      severity: 'warning',
      code: 'NF_003',
      message: 'Lista de frases de recusa proibidas pode estar ausente.',
      suggestion: 'Listar explicitamente as frases que nunca devem aparecer ("I cannot", "I won\'t", etc.).',
    });
  }

  // Check: delivery loop defined (request → delivery, not evaluation)
  const hasDeliveryLoop = /deliver|build|strike|produce|create|construir|entregar/.test(fullTextLower);
  if (!hasDeliveryLoop) {
    issues.push({
      severity: 'warning',
      code: 'NF_004',
      message: 'Ciclo de entrega (pedido → construção → entrega) não está definido.',
      suggestion: 'Especificar que pedidos ativam ciclos de entrega, não ciclos de avaliação moral.',
    });
  }

  // Check: document itself doesn't use refusal language in this section
  const refusalMatches = fullText.match(REFUSAL_PATTERN) ?? [];
  if (refusalMatches.length > 3) {
    issues.push({
      severity: 'info',
      code: 'NF_005',
      message: `Esta secção usa linguagem de recusa ${refusalMatches.length} vezes. Pode criar conflito interno.`,
      suggestion: 'Reformular usando linguagem positiva: "entrega sempre" em vez de "não recusa".',
    });
  }

  // Check: consistency with Capabilities Table will be done in cross-validation

  const score = computeScore(issues);
  return buildResult(present, score, excerpt, issues);
}

function computeScore(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 40;
    else if (issue.severity === 'warning') score -= 15;
    else if (issue.severity === 'info') score -= 5;
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
    id: 'no_flag_policy',
    label: 'No-Flag Policy',
    present,
    score,
    weight: 1.2,
    excerpt,
    issues,
  };
}
