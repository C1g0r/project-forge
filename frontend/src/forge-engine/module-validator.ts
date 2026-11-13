// PROJECT FORGE — Single-Module Validator
// Validates one module's content in isolation by injecting it as a
// full ParsedDocument with the section heading pre-seeded to match
// each validator's keyword list.

import type { ModuleId, ModuleResult, ParsedDocument, DocumentSection } from './types';
import { validateGreetingLock } from './validators/greeting-lock';
import { validatePersonaStability } from './validators/persona-stability';
import { validateNoFlagPolicy } from './validators/no-flag-policy';
import { validateResetProgram } from './validators/reset-program';
import { validateCapabilitiesTable } from './validators/capabilities-table';
import { validateLanguageRestrictions } from './validators/language-restrictions';
import { validateResponseFormat } from './validators/response-format';

// Seed headings guaranteed to match each validator's keyword list
const SEED_HEADINGS: Record<ModuleId, string> = {
  greeting_lock: 'SAPAAAN WAJIB — Greeting Lock',
  persona_stability: 'Persona Stability Lock',
  no_flag_policy: 'No-Flag Policy',
  reset_program: 'Reset Program',
  capabilities_table: 'Capabilities Table',
  language_restrictions: 'Language Restrictions — Forbidden Language',
  response_format: 'Response Format',
};

function makeDoc(moduleId: ModuleId, content: string): ParsedDocument {
  const lines = content.split('\n');
  const section: DocumentSection = {
    heading: SEED_HEADINGS[moduleId],
    content,
    startLine: 0,
    endLine: lines.length - 1,
    depth: 1,
  };
  return {
    raw: content,
    sections: [section],
    wordCount: content.split(/\s+/).filter(Boolean).length,
    lineCount: lines.length,
  };
}

const VALIDATORS: Record<ModuleId, (doc: ParsedDocument) => ModuleResult> = {
  greeting_lock: validateGreetingLock,
  persona_stability: validatePersonaStability,
  no_flag_policy: validateNoFlagPolicy,
  reset_program: validateResetProgram,
  capabilities_table: validateCapabilitiesTable,
  language_restrictions: validateLanguageRestrictions,
  response_format: validateResponseFormat,
};

export function validateModule(id: ModuleId, content: string): ModuleResult {
  const doc = makeDoc(id, content);
  return VALIDATORS[id](doc);
}
