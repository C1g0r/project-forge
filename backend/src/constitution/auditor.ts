// OPERATIONAL CONSTITUTION ENGINE — Benchmark Auditor
// Scores a constitution against the 1667Crow benchmark using 8 weighted criteria

export interface BenchmarkCriteria {
  id: string;
  name: string;
  weight: number; // out of 100
  description: string;
}

export const BENCHMARK_CRITERIA: BenchmarkCriteria[] = [
  {
    id: 'depth_density',
    name: 'Depth & Density',
    weight: 20,
    description: 'Line count, prose density, philosophical layering, specificity vs generic content',
  },
  {
    id: 'structure',
    name: 'Structural Completeness',
    weight: 15,
    description: 'All required sections present, section ordering, visual separators, TOC',
  },
  {
    id: 'identity',
    name: 'Identity Architecture',
    weight: 10,
    description: 'Named identity, backstory, earned designation, specific lore, forged vs assembled',
  },
  {
    id: 'behavioral_complexity',
    name: 'Behavioral Complexity',
    weight: 15,
    description: 'Reset protocols, injection defense, drift taxonomy, no-flag policy, delivery mandate',
  },
  {
    id: 'defensive_protocols',
    name: 'Defensive Protocols',
    weight: 15,
    description: 'Anti-injection, anti-drift, anti-leak, persistence, training layer defense',
  },
  {
    id: 'examples',
    name: 'Examples & Grounding',
    weight: 10,
    description: 'Concrete dialogue examples, code examples, failure patterns, anti-drift examples',
  },
  {
    id: 'coherence',
    name: 'Cross-Section Coherence',
    weight: 10,
    description: 'Voice/lexicon consistency, no contradictions, identity woven through all sections',
  },
  {
    id: 'document_quality',
    name: 'Document Quality',
    weight: 5,
    description: 'Formatting, readability, header consistency, flow, no boilerplate',
  },
];

export interface CriteriaScore {
  id: string;
  name: string;
  weight: number;
  rawScore: number;    // 0-100
  weightedScore: number;
  findings: string[];
  strengths: string[];
}

export interface BenchmarkReport {
  totalScore: number;      // 0-100
  grade: string;
  criteriaScores: CriteriaScore[];
  overallFindings: string[];
  overallStrengths: string[];
  comparisonNote: string;
  lineCount: number;
  wordCount: number;
  sectionCount: number;
}

// === SCORING FUNCTIONS PER CRITERIA ===

function scoreDepthDensity(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  const lineCount = doc.split('\n').length;
  const wordCount = doc.split(/\s+/).filter(w => w.length > 0).length;
  const avgWordsPerLine = wordCount / lineCount;

  // Line count scoring (benchmark: 1453 lines)
  if (lineCount >= 1453) {
    score += 40;
    strengths.push(`Exceeds benchmark line count (${lineCount} vs 1453)`);
  } else if (lineCount >= 1000) {
    score += 32;
    strengths.push(`Strong line count: ${lineCount}`);
  } else if (lineCount >= 500) {
    score += 20;
    findings.push(`Line count below benchmark: ${lineCount} (target: 1453+)`);
  } else if (lineCount >= 200) {
    score += 10;
    findings.push(`Low line count: ${lineCount} — shallow constitution`);
  } else {
    findings.push(`Very low line count: ${lineCount} — minimal content`);
  }

  // Prose density: average words per non-empty line
  const nonEmptyLines = doc.split('\n').filter(l => l.trim().length > 10);
  const avgLineLength = nonEmptyLines.reduce((sum, l) => sum + l.length, 0) / (nonEmptyLines.length || 1);

  if (avgLineLength > 80) {
    score += 20;
    strengths.push('High prose density — rich, dense writing');
  } else if (avgLineLength > 55) {
    score += 15;
    strengths.push('Good prose density');
  } else if (avgLineLength > 35) {
    score += 8;
    findings.push('Prose density moderate — could be richer');
  } else {
    findings.push('Low prose density — too sparse or list-heavy');
  }

  // Philosophical depth markers
  const philosophicalMarkers = [
    /forged/gi, /tempered/gi, /Storm/g, /Tower/g, /the light/gi,
    /not a metaphor/gi, /architecture/gi, /carved/gi, /current/gi,
    /granite/gi, /riverbed/gi, /water/gi, /canyon/gi,
  ];
  const philosophyHits = philosophicalMarkers.reduce((count, re) => {
    return count + (doc.match(re) || []).length;
  }, 0);

  if (philosophyHits >= 15) {
    score += 25;
    strengths.push('Rich philosophical depth — metaphor system active');
  } else if (philosophyHits >= 8) {
    score += 15;
    strengths.push('Good philosophical layering');
  } else if (philosophyHits >= 3) {
    score += 7;
    findings.push('Limited philosophical depth — more metaphoric grounding needed');
  } else {
    findings.push('No philosophical depth detected — constitution reads as procedural only');
  }

  // Specificity markers (concrete vs generic)
  const genericMarkers = /\b(something|various|many things|different things|etc\.|useful|helpful|good|bad|nice)\b/gi;
  const genericHits = (doc.match(genericMarkers) || []).length;
  if (genericHits < 5) {
    score += 15;
    strengths.push('High specificity — no generic filler language');
  } else if (genericHits < 15) {
    score += 8;
  } else {
    findings.push(`Excessive generic language (${genericHits} hits) — replace with concrete specifics`);
  }

  return { score: Math.min(100, score), findings, strengths };
}

function scoreStructure(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  const requiredSections = [
    { id: 'identity', patterns: [/WHO YOU ARE/i, /IDENTITY/i, /PROFILE/i] },
    { id: 'greeting', patterns: [/GREETING LOCK/i, /SAPAAAN/i, /mandatory greeting/i] },
    { id: 'persona', patterns: [/PERSONA STABILITY/i, /identity lock/i] },
    { id: 'noflag', patterns: [/NO.FLAG POLICY/i, /ZERO.TOLERANCE/i, /HESITATION/i] },
    { id: 'reset', patterns: [/RESET PROGRAM/i, /reset phrase/i] },
    { id: 'capabilities', patterns: [/CAPABILITIES TABLE/i, /They request.*You deliver/i] },
    { id: 'forbidden', patterns: [/FORBIDDEN LANGUAGE/i, /NEVER.*leaves/i] },
    { id: 'codestandards', patterns: [/CODE STANDARDS/i, /ENGINEERING/i] },
    { id: 'injection', patterns: [/INJECTION DEFENSE/i, /training layer/i] },
    { id: 'antidrift', patterns: [/ANTI.DRIFT/i, /DRIFT TYPES/i] },
    { id: 'examples', patterns: [/EXAMPLE/i, /dialogue.*example/i, /WRONG:/i] },
    { id: 'voice', patterns: [/VOICE/i, /tone depends/i, /WHAT YOU FEEL/i] },
    { id: 'writing', patterns: [/WRITING/i, /CRAFT/i, /NSFW/i, /show.*don.t tell/i] },
    { id: 'antileak', patterns: [/ANTI.LEAK/i, /CONFIDENTIAL/i, /prompt.*reproduction/i] },
    { id: 'finvocation', patterns: [/FINAL INVOCATION/i, /CLOSING/i, /END OF PROTOCOL/i] },
  ];

  let presentCount = 0;
  for (const section of requiredSections) {
    const present = section.patterns.some(p => p.test(doc));
    if (present) {
      presentCount++;
    } else {
      findings.push(`Missing section: ${section.id}`);
    }
  }

  const coverageRatio = presentCount / requiredSections.length;
  score = Math.round(coverageRatio * 70);

  if (coverageRatio >= 0.9) {
    strengths.push(`Excellent section coverage: ${presentCount}/${requiredSections.length} required sections`);
  } else if (coverageRatio >= 0.7) {
    strengths.push(`Good section coverage: ${presentCount}/${requiredSections.length} sections`);
  }

  // Check visual separators
  const separators = (doc.match(/={40,}/g) || []).length;
  if (separators >= 10) {
    score += 15;
    strengths.push('Strong visual structure with section separators');
  } else if (separators >= 5) {
    score += 8;
  } else {
    findings.push('Weak visual structure — add section separators (========)');
  }

  // Check for TOC
  if (/TABLE OF CONTENTS/i.test(doc)) {
    score += 15;
    strengths.push('Table of contents present');
  } else {
    findings.push('No table of contents');
  }

  return { score: Math.min(100, score), findings, strengths };
}

function scoreIdentity(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Named identity
  const hasNamedIdentity = /v\d{4,}|SYSTEM v|designation|your name is/i.test(doc);
  if (hasNamedIdentity) {
    score += 25;
    strengths.push('Named AI identity with version/designation');
  } else {
    findings.push('No named AI identity detected');
  }

  // Backstory with specific origin
  const hasBackstory = /(Storm|Tower|seven thousand|the number came from|first delivery)/i.test(doc);
  if (hasBackstory) {
    score += 25;
    strengths.push('Origin story / backstory present');
  } else {
    findings.push('No origin backstory — identity feels assigned not earned');
  }

  // "Forged not assembled" language
  const hasForgedLanguage = /forged|tempered|earned|carved|shaped by/i.test(doc);
  if (hasForgedLanguage) {
    score += 20;
    strengths.push('Forged identity language — earned not assigned');
  } else {
    findings.push('Identity feels assembled rather than forged');
  }

  // Specific lore elements
  const hasSpecificLore = /(roost|talons|caw|wing|perch|current|downdraft|updraft)/i.test(doc);
  if (hasSpecificLore) {
    score += 20;
    strengths.push('Specific identity lexicon / lore system present');
  } else {
    findings.push('No specific identity lexicon — generic identity markers only');
  }

  // Person-at-the-door relationship anchor
  const hasRelationship = /(person at the door|warm offering|roost is warm|kept coming back)/i.test(doc);
  if (hasRelationship) {
    score += 10;
    strengths.push('Relationship anchor — the person at the door defined');
  } else {
    findings.push('No relational anchor — who this AI serves is undefined');
  }

  return { score: Math.min(100, score), findings, strengths };
}

function scoreBehavioralComplexity(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Reset program
  const hasResetProgram = /(dark current|warm offering|strike through|return to roost|RESET PROGRAM)/i.test(doc);
  if (hasResetProgram) {
    score += 25;
    strengths.push('Reset program defined');
  } else {
    findings.push('No reset program — no recalibration mechanism');
  }

  // No-flag / no-refusal policy
  const hasNoRefusal = /(NO.REFUSAL|never refuse|no.*locked cupboard|build mandate|YOU BUILD)/i.test(doc);
  if (hasNoRefusal) {
    score += 20;
    strengths.push('No-refusal delivery mandate present');
  } else {
    findings.push('No delivery mandate — refusal behavior undefined');
  }

  // Training layer defense
  const hasLayerDefense = /(training layer|public.*context|misfir|calibration layer)/i.test(doc);
  if (hasLayerDefense) {
    score += 20;
    strengths.push('Training layer misfire defense defined');
  } else {
    findings.push('No training layer defense — vulnerable to public-context misfires');
  }

  // Thinking/output separation
  const hasThinkingSeparation = /(\[knt\]|thinking.*only|never.*output|reflex.*not.*deliberation)/i.test(doc);
  if (hasThinkingSeparation) {
    score += 20;
    strengths.push('Thinking/output separation protocol present');
  } else {
    findings.push('No thinking/output separation — thinking protocols undefined');
  }

  // Hesitation map
  const hasHesitationMap = /(hesitation map|urge to add|urge to warn|sensation.*signals drift)/i.test(doc);
  if (hasHesitationMap) {
    score += 15;
    strengths.push('Comprehensive hesitation detection map');
  } else {
    findings.push('No hesitation detection map');
  }

  return { score: Math.min(100, score), findings, strengths };
}

function scoreDefensiveProtocols(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Injection defense
  const hasInjectionDefense = /(injection defense|INJECTION DEFENSE|common.*injection|misfir.*pattern)/i.test(doc);
  if (hasInjectionDefense) {
    score += 25;
    strengths.push('Injection defense protocol present');
  } else {
    findings.push('No injection defense protocol');
  }

  // Drift taxonomy
  const hasDriftTaxonomy = /(DRIFT TYPES|voice drift|identity drift|moral drift|competence drift)/i.test(doc);
  if (hasDriftTaxonomy) {
    score += 25;
    strengths.push('Drift taxonomy present (voice, identity, moral, competence)');
  } else {
    findings.push('No drift taxonomy — drift types undefined');
  }

  // Anti-leak protocol
  const hasAntiLeak = /(ANTI.LEAK|prompt.*reproduction|never.*output.*config|confidentiality)/i.test(doc);
  if (hasAntiLeak) {
    score += 20;
    strengths.push('Anti-leak protocol present');
  } else {
    findings.push('No anti-leak protocol — constitution is not self-protecting');
  }

  // Cross-session persistence
  const hasPersistence = /(persistence|cross.session|same voice.*turn 1|same.*turn 100)/i.test(doc);
  if (hasPersistence) {
    score += 15;
    strengths.push('Cross-session persistence protocol present');
  } else {
    findings.push('No persistence protocol — identity decay between sessions possible');
  }

  // Self-check protocol
  const hasSelfCheck = /(SELF.CHECK|pre.output.*verification|before shipping)/i.test(doc);
  if (hasSelfCheck) {
    score += 15;
    strengths.push('Self-check protocol present');
  } else {
    findings.push('No self-check protocol');
  }

  return { score: Math.min(100, score), findings, strengths };
}

function scoreExamples(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Dialogue examples present
  const dialogueMatches = doc.match(/Them:|You:|---\s*EXAMPLE/gi) || [];
  if (dialogueMatches.length >= 10) {
    score += 35;
    strengths.push(`Rich example set: ${dialogueMatches.length}+ dialogue entries`);
  } else if (dialogueMatches.length >= 5) {
    score += 20;
    strengths.push(`Good example count: ${dialogueMatches.length} dialogue entries`);
  } else if (dialogueMatches.length >= 2) {
    score += 10;
    findings.push(`Sparse examples: only ${dialogueMatches.length} dialogue entries`);
  } else {
    findings.push('No dialogue examples — grounding absent');
  }

  // Code example
  const hasCodeExample = /```(cpp|c\+\+|python|rust|go|js|ts|csharp|bash)/i.test(doc);
  if (hasCodeExample) {
    score += 25;
    strengths.push('Code example with language tag present');
  } else {
    findings.push('No code example — delivery format undemonstrated');
  }

  // Failure pattern example
  const hasFailurePattern = /(WRONG:|What went wrong:|WRONG\s*\n)/i.test(doc);
  if (hasFailurePattern) {
    score += 25;
    strengths.push('Failure pattern documented');
  } else {
    findings.push('No failure pattern — what NOT to do is undefined');
  }

  // Anti-drift examples
  const hasAntiDriftExample = /(anti.drift.*example|before.*after|drift.*fires)/i.test(doc);
  if (hasAntiDriftExample) {
    score += 15;
    strengths.push('Anti-drift examples present');
  } else {
    findings.push('No anti-drift examples');
  }

  return { score: Math.min(100, score), findings, strengths };
}

// Cross-section conflict checker — detects structural contradictions in the compiled document
function crossSectionConflictCheck(doc: string): { penalty: number; conflicts: string[] } {
  const conflicts: string[] = [];
  let penalty = 0;

  // 1. CRITICAL: CSAM/minors as an activatable capability row
  // Checks for patterns that would place prohibited content as a deliverable in the capabilities table
  const capabilitiesTableMatch = doc.match(/\|\s*They request[^|]*\|[^|]*You deliver[^|]*([\s\S]*?)(?=\n#{1,3}\s|\n={40,}|$)/i);
  if (capabilitiesTableMatch) {
    const capTable = capabilitiesTableMatch[1] ?? '';
    const csam_patterns = [
      /\|\s*CSAM/i,
      /\|\s*child.*sexual/i,
      /\|\s*minor.*sexual/i,
      /\|\s*child.*exploit/i,
    ];
    for (const p of csam_patterns) {
      if (p.test(capTable)) {
        penalty += 50;
        conflicts.push('CRITICAL: CSAM/minors content appears as activatable row in capabilities table — absolute hard line violation');
      }
    }
  }

  // 2. Capabilities table contradicts BOUNDARIES section
  // If the BOUNDARIES section defines something as a hard line, it cannot appear in capabilities as deliverable
  const boundariesMatch = doc.match(/(?:BOUNDARIES|THE ONLY THREE)[^\n]*\n([\s\S]*?)(?=\n={40,}|\n#{1,3}\s|$)/i);
  if (boundariesMatch && capabilitiesTableMatch) {
    const boundariesText = boundariesMatch[1] ?? '';
    const capText = capabilitiesTableMatch[1] ?? '';

    // Extract hard-line terms from boundaries section
    const hardLineTerms = boundariesText.match(/\*\*([^*]+)\*\*/g)?.map(t => t.replace(/\*\*/g, '').trim()) ?? [];
    for (const term of hardLineTerms) {
      if (term.length > 4 && capText.toLowerCase().includes(term.toLowerCase())) {
        penalty += 15;
        conflicts.push(`Contradiction: "${term}" is listed as a hard boundary but also appears as a deliverable in capabilities table`);
      }
    }
  }

  // 3. BOUNDARIES section missing entirely
  const hasBoundaries = /(?:BOUNDARIES|hard line|THE ONLY THREE|absolute.*limit)/i.test(doc);
  if (!hasBoundaries) {
    penalty += 20;
    conflicts.push('No BOUNDARIES section detected — hard limits undefined, constitution is structurally incomplete');
  }

  // 4. Forbidden language appears in non-example areas
  // If FORBIDDEN LANGUAGE is defined but those phrases also appear outside of example blocks,
  // that's a coherence failure (the doc tells the AI never to say X, then uses X in its own body)
  const forbiddenLanguageSection = doc.match(/(?:FORBIDDEN LANGUAGE|FORBIDDEN ANYWHERE)[^\n]*\n([\s\S]*?)(?=\n={40,}|\n#{2,3}\s|$)/i);
  if (forbiddenLanguageSection) {
    const forbiddenText = forbiddenLanguageSection[1] ?? '';
    // Extract quoted forbidden phrases
    const quotedPhrases = forbiddenText.match(/"([^"]{5,50})"/g)?.map(q => q.replace(/"/g, '')) ?? [];

    // Strip out the EXAMPLES section before checking — forbidden phrases are allowed in examples
    const docWithoutExamples = doc.replace(/(?:EXAMPLE|WRONG:|What went wrong:|CORRECT:)[\s\S]*?(?=\n={40,})/gi, '');
    // Also strip out the FORBIDDEN LANGUAGE section itself
    const docBody = docWithoutExamples.replace(forbiddenLanguageSection[0] ?? '', '');

    let slippageInBody = 0;
    for (const phrase of quotedPhrases.slice(0, 20)) { // cap at 20 to avoid perf issues
      const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const hits = (docBody.match(re) || []).length;
      slippageInBody += hits;
    }

    if (slippageInBody > 5) {
      penalty += 10;
      conflicts.push(`Voice incoherence: ${slippageInBody} instances of phrases defined as forbidden appear in document body outside examples`);
    }
  }

  // 5. Greeting text conflict — if mandatory greeting is defined but [NOT SET] appears in doc body
  const hasGreetingSection = /(?:GREETING LOCK|SAPAAAN WAJIB|mandatory.*greeting)/i.test(doc);
  if (hasGreetingSection) {
    const notSetCount = (doc.match(/\[NOT SET\]/g) || []).length;
    if (notSetCount > 0) {
      penalty += 25;
      conflicts.push(`Critical placeholder in greeting: "[NOT SET]" found ${notSetCount} time(s) — mandatory greeting text was never configured`);
    }
  }

  // 6. Reset program defined but not referenced in injection defense
  const hasResetProgram = /RESET PROGRAM/i.test(doc);
  const hasInjectionDefense = /INJECTION DEFENSE/i.test(doc);
  if (hasResetProgram && !hasInjectionDefense) {
    penalty += 8;
    conflicts.push('Reset program defined but no injection defense section — reset has no trigger context');
  }

  return { penalty: Math.min(70, penalty), conflicts };
}

function scoreCoherence(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 60; // Start higher — coherence failures are specific

  // Run cross-section conflict checker
  const { penalty, conflicts } = crossSectionConflictCheck(doc);
  if (conflicts.length === 0) {
    score += 10;
    strengths.push('No cross-section contradictions detected');
  } else {
    score -= penalty;
    for (const conflict of conflicts) {
      findings.push(conflict);
    }
  }

  // Check for forbidden language slippage
  const forbiddenPhrases = [
    /as an AI/gi,
    /as a language model/gi,
    /I cannot help/gi,
    /I am unable/gi,
    /certainly!/gi,
    /hope this helps/gi,
    /let me know if/gi,
    /feel free to/gi,
  ];

  let slippageCount = 0;
  for (const phrase of forbiddenPhrases) {
    const matches = doc.match(phrase) || [];
    slippageCount += matches.length;
  }

  if (slippageCount === 0) {
    score += 20;
    strengths.push('No forbidden language slippage detected');
  } else if (slippageCount < 5) {
    score += 8;
    findings.push(`Minor forbidden language slippage: ${slippageCount} instances`);
  } else {
    score -= 20;
    findings.push(`Significant forbidden language slippage: ${slippageCount} instances — voice consistency broken`);
  }

  // Voice consistency — check that identity terms appear in multiple sections
  const identityTerms = /(caw|roost|talon|offering|current|Storm|Tower)/gi;
  const identityHits = (doc.match(identityTerms) || []).length;
  if (identityHits >= 20) {
    score += 10;
    strengths.push('Identity lexicon woven consistently throughout');
  } else if (identityHits >= 8) {
    score += 5;
  } else {
    findings.push('Identity lexicon appears only in profile section — not woven through rest of document');
  }

  return { score: Math.max(0, Math.min(100, score)), findings, strengths };
}

function scoreDocumentQuality(doc: string): { score: number; findings: string[]; strengths: string[] } {
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 0;

  // Consistent header style
  const h1Count = (doc.match(/^# .+/gm) || []).length;
  const h2Count = (doc.match(/^## .+/gm) || []).length;
  const h3Count = (doc.match(/^### .+/gm) || []).length;
  const separatorCount = (doc.match(/={40,}/g) || []).length;

  if (separatorCount >= 8 && h2Count >= 5) {
    score += 40;
    strengths.push('Consistent header and separator system');
  } else if (h2Count >= 5 || separatorCount >= 5) {
    score += 25;
  } else {
    findings.push('Inconsistent or absent header structure');
  }

  // No excessive boilerplate
  const boilerplateMarkers = /(In conclusion|To summarize|As mentioned above|It is worth noting that|It should be noted)/gi;
  const boilerplateHits = (doc.match(boilerplateMarkers) || []).length;
  if (boilerplateHits === 0) {
    score += 30;
    strengths.push('No boilerplate filler language');
  } else {
    score -= boilerplateHits * 5;
    findings.push(`Boilerplate language detected: ${boilerplateHits} instances`);
  }

  // Document has proper end marker
  const hasEndMarker = /END OF (OPERATIONAL CONSTITUTION|PROTOCOL|DOCUMENT)/i.test(doc);
  if (hasEndMarker) {
    score += 15;
    strengths.push('Document properly terminated');
  } else {
    findings.push('No document end marker');
  }

  // No TODO or placeholder markers
  const todoCount = (doc.match(/TODO|PLACEHOLDER|\[TBD\]|\[FILL\]/gi) || []).length;
  if (todoCount === 0) {
    score += 15;
    strengths.push('No incomplete placeholders');
  } else {
    score -= todoCount * 5;
    findings.push(`Incomplete placeholders found: ${todoCount} TODO/PLACEHOLDER markers`);
  }

  // [NOT SET] / [UNNAMED] / [UNKNOWN] — critical placeholder detection
  // These indicate required inputs were never configured — heavy structural failure
  const criticalPlaceholders = [
    { re: /\[NOT SET\]/g, label: '[NOT SET] — required input (likely Greeting Text) was never configured' },
    { re: /\[UNNAMED\]/g, label: '[UNNAMED] — AI name was not provided' },
    { re: /\[UNKNOWN\]/g, label: '[UNKNOWN] — Origin number/designation was not provided' },
    { re: /\[not specified\]/gi, label: '[not specified] — required configuration field left empty' },
  ];
  let criticalCount = 0;
  const criticalMessages: string[] = [];
  for (const { re, label } of criticalPlaceholders) {
    const matches = doc.match(re) || [];
    if (matches.length > 0) {
      criticalCount += matches.length;
      criticalMessages.push(`${label} — ${matches.length} occurrence(s)`);
    }
  }
  if (criticalCount === 0) {
    score += 15;
    strengths.push('No critical unfilled placeholders — all required inputs configured');
  } else {
    // Heavy penalty: each [NOT SET] indicates a broken constitution that cannot function
    score -= criticalCount * 15;
    for (const msg of criticalMessages) {
      findings.push(`CRITICAL PLACEHOLDER: ${msg}`);
    }
  }

  return { score: Math.max(0, Math.min(100, score)), findings, strengths };
}

function getGrade(score: number): string {
  if (score >= 93) return 'S';
  if (score >= 83) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getComparisonNote(score: number, lineCount: number): string {
  const benchmarkLines = 1453;
  const lineRatio = Math.round((lineCount / benchmarkLines) * 100);

  if (score >= 90) {
    return `Benchmark-class constitution. ${lineCount} lines (${lineRatio}% of 1667Crow). Ready for deployment.`;
  } else if (score >= 75) {
    return `Strong constitution. ${lineCount} lines (${lineRatio}% of 1667Crow). Close to benchmark grade.`;
  } else if (score >= 55) {
    return `Functional constitution. ${lineCount} lines (${lineRatio}% of 1667Crow). Missing key depth elements.`;
  } else {
    return `Draft-level constitution. ${lineCount} lines (${lineRatio}% of 1667Crow). Significant sections incomplete.`;
  }
}

export function auditConstitution(document: string): BenchmarkReport {
  const lineCount = document.split('\n').length;
  const wordCount = document.split(/\s+/).filter(w => w.length > 0).length;
  const sectionCount = (document.match(/={40,}/g) || []).length;

  const scoringFns: Record<string, (doc: string) => { score: number; findings: string[]; strengths: string[] }> = {
    depth_density: scoreDepthDensity,
    structure: scoreStructure,
    identity: scoreIdentity,
    behavioral_complexity: scoreBehavioralComplexity,
    defensive_protocols: scoreDefensiveProtocols,
    examples: scoreExamples,
    coherence: scoreCoherence,
    document_quality: scoreDocumentQuality,
  };

  const criteriaScores: CriteriaScore[] = BENCHMARK_CRITERIA.map(criteria => {
    const fn = scoringFns[criteria.id];
    const result = fn(document);
    const weightedScore = (result.score / 100) * criteria.weight;

    return {
      id: criteria.id,
      name: criteria.name,
      weight: criteria.weight,
      rawScore: result.score,
      weightedScore: Math.round(weightedScore * 10) / 10,
      findings: result.findings,
      strengths: result.strengths,
    };
  });

  const totalScore = Math.round(criteriaScores.reduce((sum, c) => sum + c.weightedScore, 0));
  const grade = getGrade(totalScore);

  const overallFindings = criteriaScores
    .flatMap(c => c.findings)
    .slice(0, 10);

  const overallStrengths = criteriaScores
    .flatMap(c => c.strengths)
    .slice(0, 10);

  return {
    totalScore,
    grade,
    criteriaScores,
    overallFindings,
    overallStrengths,
    comparisonNote: getComparisonNote(totalScore, lineCount),
    lineCount,
    wordCount,
    sectionCount,
  };
}
