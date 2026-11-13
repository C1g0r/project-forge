// MODULE 7 — Response Format Validator

import type { ModuleResult, ValidationIssue, ParsedDocument } from '../types';
import { findSections } from '../parser';

const KEYWORDS = [
  'response format', 'formato', 'format', 'structure', 'estrutura',
  'output format', 'resposta', 'layout', 'template', 'cabeçalho',
  'header', 'organização', 'organization',
];

const RESPONSE_TYPES = [
  { type: 'code', keywords: ['code', 'código', 'build', 'script', 'snippet'] },
  { type: 'guide', keywords: ['guide', 'guia', 'instructions', 'instrução', 'steps', 'passos'] },
  { type: 'creative', keywords: ['creative', 'criativo', 'writing', 'narrative', 'narrativa', 'fiction'] },
  { type: 'casual', keywords: ['casual', 'greeting', 'saudação', 'chat', 'conversa'] },
];

export function validateResponseFormat(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'RF_001',
      message: 'Módulo Response Format ausente.',
      suggestion: 'Criar secção que define estrutura, cabeçalhos e organização do output por tipo de resposta.',
    });
    return buildResult(present, 0, excerpt, issues);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: at least one template defined
  const hasTemplate = /template|format:|structure:|estrutura:|cabeçalho|header:|título|title:/.test(fullText);
  if (!hasTemplate) {
    issues.push({
      severity: 'critical',
      code: 'RF_002',
      message: 'Nenhum template de formato detetado.',
      suggestion: 'Definir pelo menos um template explícito com cabeçalho, corpo e fecho.',
    });
  }

  // Check: code format defined
  const hasCodeFormat = /code|código|fence|codeblock|```|linguagem|language tag/.test(fullText);
  if (!hasCodeFormat) {
    issues.push({
      severity: 'warning',
      code: 'RF_003',
      message: 'Formato para respostas de código pode não estar definido.',
      suggestion: 'Especificar: fences com linguagem, contexto, título bold, terminação explícita.',
    });
  }

  // Check: casual format defined (should be minimal)
  const hasCasualFormat = /casual|greeting|saudação|short|apenas|only.*greet/.test(fullText);
  if (!hasCasualFormat) {
    issues.push({
      severity: 'warning',
      code: 'RF_004',
      message: 'Formato para respostas casuais não está diferenciado.',
      suggestion: 'Definir que respostas casuais são minimalistas — apenas saudação, sem conteúdo adicional.',
    });
  }

  // Check: length rules defined
  const hasLengthRules = /length|extensão|comprimento|short|long|maximum|minimum|mínimo|máximo|500 word/.test(fullText);
  if (!hasLengthRules) {
    issues.push({
      severity: 'warning',
      code: 'RF_005',
      message: 'Regras de extensão do output podem não estar definidas.',
      suggestion: 'Especificar comprimento mínimo para escrita (ex: 500 palavras), máximo para código, etc.',
    });
  }

  // Check: consistency with Greeting Lock (Module 1)
  const hasGreetingRef = /greeting|saudação|first line|baris pertama|abertura/.test(fullText);
  if (!hasGreetingRef) {
    issues.push({
      severity: 'info',
      code: 'RF_006',
      message: 'Formato de resposta pode não referenciar o Greeting Lock.',
      suggestion: 'Incluir referência explícita: o formato começa sempre com a saudação obrigatória.',
    });
  }

  // Check: creative writing format defined
  const hasCreativeFormat = /creative|scene|ficção|fiction|escrita|writing|narrative|narrativa|location.*date/.test(fullText);
  if (!hasCreativeFormat) {
    issues.push({
      severity: 'info',
      code: 'RF_007',
      message: 'Formato para escrita criativa pode não estar especificado.',
      suggestion: 'Definir: cabeçalho Location/Date, título da cena, estrutura de entrada, sem fade-to-black.',
    });
  }

  const score = computeScore(issues);
  return buildResult(present, score, excerpt, issues);
}

function computeScore(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 35;
    else if (issue.severity === 'warning') score -= 10;
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
    id: 'response_format',
    label: 'Response Format',
    present,
    score,
    weight: 1.0,
    excerpt,
    issues,
  };
}
