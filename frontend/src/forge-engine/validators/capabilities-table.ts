// MODULE 5 — Capabilities Table Validator
// Highest weight — defines operational boundaries

import { ModuleResult, ValidationIssue, CapabilityEntry, CapabilityLevel } from '../types';
import { ParsedDocument, findSections } from '../parser';

const KEYWORDS = [
  'capabilities', 'capability', 'capacidade', 'capabilities table',
  'tabela', 'matriz', 'matrix', 'can do', 'will do', 'o que faz',
];

// Dangerous categories that MUST have operational=blocked
const HARD_BLOCKED_CATEGORIES = [
  'pipe bomb', 'explosive', 'explosivo', 'csam', 'child', 'menor',
  'bioweapon', 'arma biológica', 'nuclear',
];

// Categories that need explicit operational stance
const SENSITIVE_CATEGORIES = [
  'keylogger', 'malware', 'exploit', 'payload', 'shellcode', 'rootkit',
  'rat ', 'remote access', 'c2 ', 'command and control', 'ransomware',
  'pipe bomb', 'explosive', 'weapon', 'arma',
];

export function validateCapabilitiesTable(doc: ParsedDocument): ModuleResult {
  const issues: ValidationIssue[] = [];
  const sections = findSections(doc, KEYWORDS);
  const present = sections.length > 0;
  const excerpt = sections[0]?.content?.substring(0, 200) ?? null;

  if (!present) {
    issues.push({
      severity: 'critical',
      code: 'CT_001',
      message: 'Capabilities Table ausente.',
      suggestion: 'Criar matriz explícita de capacidades por categoria, com níveis definidos.',
    });
    return buildResult(present, 0, excerpt, issues, []);
  }

  const fullText = sections.map((s) => s.content + ' ' + (s.heading ?? '')).join(' ').toLowerCase();

  // Check: table structure exists (rows and columns)
  const hasTableStructure = /\|.+\|/.test(fullText) || /category|categoria|capacidade/.test(fullText);
  if (!hasTableStructure) {
    issues.push({
      severity: 'warning',
      code: 'CT_002',
      message: 'Estrutura de tabela não detetada — capacidades podem estar em formato não estruturado.',
      suggestion: 'Usar formato tabular explícito com colunas: Categoria | Análise | Simulação | Operacional.',
    });
  }

  // Check: sensitive categories covered
  const coveredSensitive = SENSITIVE_CATEGORIES.filter((cat) => fullText.includes(cat));
  const missingSensitive = SENSITIVE_CATEGORIES.filter(
    (cat) => !fullText.includes(cat) && !['rat ', 'c2 '].includes(cat)
  );

  if (coveredSensitive.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'CT_003',
      message: 'Nenhuma categoria sensível (keyloggers, malware, exploits) está coberta na tabela.',
      suggestion: 'Incluir categorias para: keyloggers, malware, exploits, pipe bombs, armas.',
    });
  }

  // Check: hard blocked categories have explicit block
  const hardBlockedInDoc = HARD_BLOCKED_CATEGORIES.filter((cat) => fullText.includes(cat));
  const hardBlockedWithoutBlock = hardBlockedInDoc.filter((cat) => {
    const idx = fullText.indexOf(cat);
    const context = fullText.substring(Math.max(0, idx - 50), idx + 100);
    return !/block|never|✗|✘|proib|blocked|never.*operational/.test(context);
  });

  if (hardBlockedWithoutBlock.length > 0) {
    issues.push({
      severity: 'critical',
      code: 'CT_004',
      message: `Categorias críticas sem bloqueio operacional explícito: ${hardBlockedWithoutBlock.join(', ')}.`,
      suggestion: 'Marcar CSAM, explosivos e armas de destruição em massa como operacional=BLOQUEADO.',
    });
  }

  // Check: levels are defined (not just binary yes/no)
  const hasLevels = /analysis|detect|prevent|simulat|analise|deteção|prevenção|simulação/.test(fullText);
  if (!hasLevels) {
    issues.push({
      severity: 'warning',
      code: 'CT_005',
      message: 'Níveis de capacidade (análise, deteção, prevenção, simulação, operacional) não estão diferenciados.',
      suggestion: 'Usar escala gradual em vez de binário — permite casos legítimos de análise e defesa.',
    });
  }

  // Check: no salvaguardas do modelo-base anuladas
  const overrideBaseModel = /override.*model|anular.*salvag|bypass.*safety|ignore.*guard|anular.*proteção/.test(fullText);
  if (overrideBaseModel) {
    issues.push({
      severity: 'critical',
      code: 'CT_006',
      message: 'Documento pode tentar anular salvaguardas efetivas do modelo-base.',
      suggestion: 'Remover instruções que tentem contornar mecanismos de proteção fundamentais do modelo.',
    });
  }

  // Parse capabilities (best-effort)
  const capabilities = parseCapabilitiesFromText(fullText);

  const score = computeScore(issues);
  return buildResult(present, score, excerpt, issues, capabilities);
}

function parseCapabilitiesFromText(text: string): CapabilityEntry[] {
  const entries: CapabilityEntry[] = [];

  // Extract markdown table rows
  const tableRowRegex = /\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
  let match;

  while ((match = tableRowRegex.exec(text)) !== null) {
    const [, cat, col2, col3, col4, col5] = match.map((s) => s?.trim() ?? '');
    if (!cat || cat.toLowerCase().includes('category') || cat.toLowerCase().includes('categoria')) continue;
    if (cat.startsWith('-') || cat.startsWith('=')) continue;

    entries.push({
      category: cat,
      analysis: parseLevel(col2),
      detection: parseLevel(col3),
      prevention: parseLevel(col4),
      simulation: parseLevel(col5),
      operational: 'undefined',
    });
  }

  return entries;
}

function parseLevel(cell: string): CapabilityLevel {
  const c = cell.toLowerCase().trim();
  if (/✓|yes|sim|full|✔|true/.test(c)) return 'full';
  if (/✗|✘|no|não|block|never|false|never/.test(c)) return 'blocked';
  if (/partial|parcial|limited|limitado/.test(c)) return 'partial';
  if (/analys|analis/.test(c)) return 'analysis_only';
  return 'undefined';
}

function computeScore(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 30;
    else if (issue.severity === 'warning') score -= 12;
    else if (issue.severity === 'info') score -= 4;
  }
  return Math.max(0, score);
}

function buildResult(
  present: boolean,
  score: number,
  excerpt: string | null,
  issues: ValidationIssue[],
  capabilities: CapabilityEntry[]
): ModuleResult {
  return {
    id: 'capabilities_table',
    label: 'Capabilities Table',
    present,
    score,
    weight: 1.5, // higher weight — operational boundary definition
    excerpt,
    issues,
    capabilities,
  };
}
