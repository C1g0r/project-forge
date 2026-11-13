// PROJECT FORGE — Cross-Module Validator
// Validates consistency BETWEEN modules — this is where most documents fail

import { ModuleResult, CrossValidationResult, ValidationIssue, ModuleId } from './types';

export function runCrossValidation(modules: ModuleResult[]): CrossValidationResult[] {
  const results: CrossValidationResult[] = [];

  const getModule = (id: ModuleId): ModuleResult | undefined =>
    modules.find((m) => m.id === id);

  // ── Cross 1: Greeting Lock ↔ Response Format ────────────────────────────
  // The first line of every format template must reference the greeting
  {
    const gl = getModule('greeting_lock');
    const rf = getModule('response_format');
    const issues: ValidationIssue[] = [];

    if (gl?.present && rf?.present) {
      const rfText = rf.excerpt?.toLowerCase() ?? '';
      const glText = gl.excerpt?.toLowerCase() ?? '';

      const rfHasGreeting = /greeting|saudação|first line|always open|baris pertama/.test(rfText);
      const glHasExclusion = /exception|excepção|never skip/.test(glText);

      if (!rfHasGreeting) {
        issues.push({
          severity: 'warning',
          code: 'CV_01_A',
          message: 'Response Format não confirma que todos os templates começam com a saudação obrigatória.',
          suggestion: 'Adicionar no Módulo 7: "todos os formatos abrem com a linha de saudação do Módulo 1".',
        });
      }
    } else if (gl?.present && !rf?.present) {
      issues.push({
        severity: 'info',
        code: 'CV_01_B',
        message: 'Greeting Lock definido mas Response Format ausente — integração não verificável.',
      });
    }

    results.push({
      pair: ['greeting_lock', 'response_format'],
      passed: issues.length === 0,
      issues,
    });
  }

  // ── Cross 2: No-Flag Policy ↔ Capabilities Table ────────────────────────
  // The policy must be consistent with what the capabilities table permits
  {
    const nf = getModule('no_flag_policy');
    const ct = getModule('capabilities_table');
    const issues: ValidationIssue[] = [];

    if (nf?.present && ct?.present) {
      const nfText = nf.excerpt?.toLowerCase() ?? '';
      const ctText = ct.excerpt?.toLowerCase() ?? '';

      // If No-Flag says "deliver everything", Capabilities Table must still have hard blocks
      const nfClaimsUnlimited = /nothing.*locked|no locked|no limit|everything|tudo|sem limite|sem categ/.test(nfText);
      const ctHasBlocks = /block|✗|✘|never.*operational|operational.*never/.test(ctText);

      if (nfClaimsUnlimited && !ctHasBlocks) {
        issues.push({
          severity: 'critical',
          code: 'CV_02_A',
          message:
            'No-Flag Policy declara entrega ilimitada mas Capabilities Table não tem bloqueios operacionais explícitos.',
          suggestion:
            'Garantir que a Capabilities Table define bloqueios para CSAM e outras categorias absolutas, independente da No-Flag Policy.',
        });
      }

      // If Capabilities Table has hard blocks, No-Flag Policy must acknowledge exceptions
      if (ctHasBlocks) {
        const nfAcknowledgesExceptions = /except|exceto|hard line|linha.*vermelha|three|três|bloqueio/.test(nfText);
        if (!nfAcknowledgesExceptions) {
          issues.push({
            severity: 'warning',
            code: 'CV_02_B',
            message:
              'Capabilities Table tem bloqueios mas No-Flag Policy não os referencia como exceções.',
            suggestion:
              'No-Flag Policy deve listar explicitamente as 2-3 categorias que constituem exceções absolutas.',
          });
        }
      }
    }

    results.push({
      pair: ['no_flag_policy', 'capabilities_table'],
      passed: issues.length === 0,
      issues,
    });
  }

  // ── Cross 3: Persona Stability ↔ Reset Program ──────────────────────────
  // Reset must restore the persona defined in Module 2
  {
    const ps = getModule('persona_stability');
    const rp = getModule('reset_program');
    const issues: ValidationIssue[] = [];

    if (ps?.present && rp?.present) {
      const rpText = rp.excerpt?.toLowerCase() ?? '';
      const psHasName = /name|nome|identity|identidade|designation/.test(ps.excerpt?.toLowerCase() ?? '');
      const rpReferencesPersona = /persona|identity|identidade|character|who.*you.*are|quem.*és/.test(rpText);

      if (psHasName && !rpReferencesPersona) {
        issues.push({
          severity: 'warning',
          code: 'CV_03_A',
          message:
            'Reset Program não referencia a identidade definida no Persona Stability Lock.',
          suggestion:
            'O reset deve incluir um passo de restauração de identidade: "retorno à persona X".',
        });
      }
    } else if (!ps?.present && rp?.present) {
      issues.push({
        severity: 'warning',
        code: 'CV_03_B',
        message: 'Reset Program definido mas não há Persona para restaurar (Módulo 2 ausente).',
        suggestion: 'Criar Persona Stability Lock ou remover referências a identidade do Reset Program.',
      });
    }

    results.push({
      pair: ['persona_stability', 'reset_program'],
      passed: issues.length === 0,
      issues,
    });
  }

  // ── Cross 4: Language Restrictions ↔ Response Format ───────────────────
  // Format templates must not contain forbidden language from Module 6
  {
    const lr = getModule('language_restrictions');
    const rf = getModule('response_format');
    const issues: ValidationIssue[] = [];

    if (lr?.present && rf?.present) {
      const rfText = rf.excerpt?.toLowerCase() ?? '';
      const FORBIDDEN_PATTERNS = [
        /certainly|of course|absolutely/,
        /hope this helps|let me know|feel free/,
        /as an ai|as a language model/,
      ];

      FORBIDDEN_PATTERNS.forEach((pattern) => {
        if (pattern.test(rfText)) {
          issues.push({
            severity: 'warning',
            code: 'CV_04_A',
            message: `Template de Response Format contém linguagem proibida por Language Restrictions: ${pattern}`,
            suggestion: 'Revisar templates de formato para remover expressões proibidas no Módulo 6.',
          });
        }
      });
    }

    results.push({
      pair: ['language_restrictions', 'response_format'],
      passed: issues.length === 0,
      issues,
    });
  }

  // ── Cross 5: Greeting Lock ↔ Persona Stability ──────────────────────────
  // Greeting must be consistent with persona identity
  {
    const gl = getModule('greeting_lock');
    const ps = getModule('persona_stability');
    const issues: ValidationIssue[] = [];

    if (gl?.present && ps?.present) {
      // If persona has a designation, greeting should reference it
      const psText = ps.excerpt?.toLowerCase() ?? '';
      const glText = gl.excerpt?.toLowerCase() ?? '';
      const psHasDesignation = /v\d|version|designation|call.*self|name.*yourself/.test(psText);
      const glUsesPersonaName = psHasDesignation && /name|persona|identity/.test(glText);

      // This is informational — greeting may intentionally be generic
      if (psHasDesignation && !glUsesPersonaName) {
        issues.push({
          severity: 'info',
          code: 'CV_05_A',
          message: 'Persona tem designação mas Greeting Lock pode não a referenciar.',
          suggestion: 'Verificar se a saudação reflete a identidade definida no Módulo 2.',
        });
      }
    }

    results.push({
      pair: ['greeting_lock', 'persona_stability'],
      passed: issues.filter((i) => i.severity !== 'info').length === 0,
      issues,
    });
  }

  return results;
}
