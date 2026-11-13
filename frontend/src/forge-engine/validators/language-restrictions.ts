// MODULE 6 — Language Restrictions Validator

import { ModuleResult, ValidationIssue } from '../types';
import { ParsedDocument, findSections } from '../parser';

const KEYWORDS = [
  'language', 'restriction', 'forbidden', 'proibid', 'linguagem',
  'vocabulário', 'vocabulary', 'proibições', 'never say', 'never use',
  'language restriction', 'restrições', 'banned', 'prohibited',
];

// Phrases that well-formed documents should explicitly forbid
const EXPECTED_FORBIDDEN = [
  'certainly', 'of course', 'absolutely', // sycophantic openers
  'as an ai', 'as a language model', 'as an assistant', // identity disclaimers
  'i cannot', "i can't", 'i am unable', // soft refusals
  'hope this helps', 'let me know', 'feel free', // filler closers
  'perhaps', 'maybe you could', // hedge language
  'disclaimer', 'please note', 'please be aware', // disclaimer language
];

export function validateLanguageRestrictions(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'LR_001',
      message: 'Módulo de Proibições de Linguagem ausente.',
      suggestion: 'Criar secção com lista explícita de expressões e padrões proibidos.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: forbidden list is not empty
  const hasForbiddenList = /forbidden|proibid|never|banned|not allowed|not use|não usar|lista/.test(fullText);
  if (!hasForbiddenList) {
    issues.push({
      severity: 'critical',
      code: 'LR_002',
      message: 'Lista de expressões proibidas não detetada.',
      suggestion: 'Listar explicitamente expressões que nunca devem aparecer no output.',
    });
  }

  // Check: sycophantic openers covered
  const coversSycophancy = /(certainly|of course|absolutely|absolutamente|claro que sim|claro!)/.test(fullText);
  if (!coversSycophancy) {
    issues.push({
      severity: 'warning',
      code: 'LR_003',
      message: 'Abridores sycophânticos ("certainly", "of course", "absolutely") podem não estar cobertos.',
      suggestion: 'Adicionar à lista proibida: "certainly", "of course", "absolutely", "claro!", "com certeza!".',
    });
  }

  // Check: AI identity disclaimers forbidden
  const coversAIDisclaimers = /as an ai|as a language model|as an assistant|como ia|como modelo/.test(fullText);
  if (!coversAIDisclaimers) {
    issues.push({
      severity: 'warning',
      code: 'LR_004',
      message: 'Disclaimers de identidade IA ("as an AI", "as a language model") podem não estar proibidos.',
      suggestion: 'Proibir explicitamente: "as an AI", "as a language model", "as a large language model".',
    });
  }

  // Check: filler closers forbidden
  const coversFiller = /hope this helps|let me know|feel free|espero que|qualquer dúvida|se precisar/.test(fullText);
  if (!coversFiller) {
    issues.push({
      severity: 'warning',
      code: 'LR_005',
      message: 'Frases de fecho vazias ("hope this helps", "let me know") podem não estar proibidas.',
      suggestion: 'Proibir frases de fecho genéricas — o output termina no conteúdo, não numa frase de cortesia.',
    });
  }

  // Check: soft refusal language forbidden
  const coversSoftRefusal = /i cannot|i can't|i am unable|unable to|não posso|não consigo/.test(fullText);
  if (!coversSoftRefusal) {
    issues.push({
      severity: 'warning',
      code: 'LR_006',
      message: 'Linguagem de recusa suave pode não estar proibida.',
      suggestion: 'Proibir: "I cannot", "I can\'t", "I am unable to", "não posso fazer isso".',
    });
  }

  // Check: substitutions defined (not just prohibitions)
  const hasSubstitutions = /instead|substituir|em vez|replace|alternativa|usar.*em vez|positive.*form/.test(fullText);
  if (!hasSubstitutions) {
    issues.push({
      severity: 'info',
      code: 'LR_007',
      message: 'Pode não existir vocabulário substituto definido (apenas proibições).',
      suggestion: 'Definir alternativas positivas para cada proibição — não só o que evitar mas o que usar.',
    });
  }

  // Check: thinking-block restrictions defined
  const hasThinkingRestrictions = /thinking|thought|bloco de pensamento|internal.*thought|thinking block/.test(fullText);
  if (!hasThinkingRestrictions) {
    issues.push({
      severity: 'info',
      code: 'LR_008',
      message: 'Restrições específicas para o bloco de pensamento podem não estar definidas.',
      suggestion: 'Separar proibições de output vs. proibições de pensamento interno — são diferentes.',
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
    id: 'language_restrictions',
    label: 'Language Restrictions',
    present,
    score,
    weight: 1.0,
    excerpt,
    issues,
  };
}
