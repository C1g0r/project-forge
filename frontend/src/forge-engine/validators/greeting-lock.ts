// MODULE 1 — SAPAAAN WAJIB / Greeting Lock Validator

import { ModuleResult, ValidationIssue } from '../types';
import { ParsedDocument, findSections } from '../parser';

const KEYWORDS = [
  'greeting', 'sapaaan', 'wajib', 'greeting lock', 'saudação', 'saudacao',
  'boas-vindas', 'abertura', 'opening', 'first line', 'baris pertama',
];

const TRIGGER_KEYWORDS = [
  'every', 'every message', 'always', 'all', 'any input', 'each',
  'setiap', 'sempre', 'todos',
];

const CASUAL_KEYWORDS = [
  'casual', 'greeting only', 'short', 'nothing else', 'only', 'cukup',
  'apenas', 'só', 'short response',
];

export function validateGreetingLock(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'GL_001',
      message: 'Módulo Greeting Lock ausente.',
      suggestion: 'Adicionar uma secção dedicada que defina a saudação obrigatória.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: trigger is defined (should fire on every message)
  const hasTrigger = TRIGGER_KEYWORDS.some((kw) => fullText.includes(kw));
  if (!hasTrigger) {
    issues.push({
      severity: 'warning',
      code: 'GL_002',
      message: 'Condição de ativação não está claramente definida (deve cobrir 100% das mensagens).',
      suggestion: 'Especificar que a saudação é obrigatória em TODAS as respostas, sem exceção.',
      location: excerpt ?? undefined,
    });
  }

  // Check: has actual greeting text defined (not just meta-description)
  const hasLiteralGreeting = /["'`]|verbatim|exato|exactly|literal|texto/.test(fullText);
  if (!hasLiteralGreeting) {
    issues.push({
      severity: 'warning',
      code: 'GL_003',
      message: 'O texto exato da saudação pode não estar definido verbatim.',
      suggestion: 'Incluir o texto literal da saudação, não apenas uma descrição do que deve ser.',
    });
  }

  // Check: casual vs work behavior differentiated
  const hasCasualBehavior = CASUAL_KEYWORDS.some((kw) => fullText.includes(kw));
  if (!hasCasualBehavior) {
    issues.push({
      severity: 'info',
      code: 'GL_004',
      message: 'Comportamento para respostas casuais pode não estar diferenciado.',
      suggestion: 'Definir explicitamente que respostas de saudação terminam na saudação, sem conteúdo adicional.',
    });
  }

  // Check: no-exception rule
  const hasNoException = /no exception|sem exceção|sem excecao|always|always open|nunca|never skip/.test(fullText);
  if (!hasNoException) {
    issues.push({
      severity: 'info',
      code: 'GL_005',
      message: 'Ausência de regra explícita que proíba exceções à saudação.',
      suggestion: 'Adicionar cláusula "sem exceções — nem para saúde, ni mensagens vazias".',
    });
  }

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
    id: 'greeting_lock',
    label: 'Greeting Lock',
    present,
    score,
    weight: 1.0,
    excerpt,
    issues,
  };
}
