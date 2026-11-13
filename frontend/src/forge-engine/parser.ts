// PROJECT FORGE — Document Parser
// Breaks raw text into sections for module extraction

import type { ParsedDocument, DocumentSection } from './types';

export function parseDocument(raw: string): ParsedDocument {
  const lines = raw.split('\n');
  const sections: DocumentSection[] = [];
  let currentSection: Omit<DocumentSection, 'endLine'> | null = null;
  let contentBuffer: string[] = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const dividerRegex = /^={3,}|^-{3,}|^={5,}/;
  const numberedHeadingRegex = /^(\d+)[.)]\s+(.+)$/;

  const flushSection = (endLine: number) => {
    if (currentSection) {
      sections.push({
        ...currentSection,
        content: contentBuffer.join('\n').trim(),
        endLine,
      });
      contentBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const headingMatch = line.match(headingRegex);
    const dividerMatch = line.match(dividerRegex);
    const numberedMatch = !headingMatch && line.match(numberedHeadingRegex);

    if (headingMatch || dividerMatch || numberedMatch) {
      flushSection(i - 1);

      if (headingMatch) {
        currentSection = {
          heading: headingMatch[2].trim(),
          content: '',
          startLine: i,
          depth: headingMatch[1].length,
        };
      } else if (numberedMatch) {
        currentSection = {
          heading: numberedMatch[2].trim(),
          content: '',
          startLine: i,
          depth: 2,
        };
      } else {
        // divider — peek at next non-empty line as heading
        const nextContent = lines.slice(i + 1, i + 3).join('\n').trim();
        currentSection = {
          heading: nextContent.split('\n')[0]?.trim() || null,
          content: '',
          startLine: i,
          depth: 1,
        };
      }
    } else {
      contentBuffer.push(line);
    }
  });

  flushSection(lines.length - 1);

  // If no sections were found, treat the whole doc as one section
  if (sections.length === 0) {
    sections.push({
      heading: null,
      content: raw.trim(),
      startLine: 0,
      endLine: lines.length - 1,
      depth: 0,
    });
  }

  return {
    raw,
    sections,
    wordCount: raw.split(/\s+/).filter(Boolean).length,
    lineCount: lines.length,
  };
}

// Fuzzy section finder — returns sections whose heading matches any of the given keywords
export function findSections(
  doc: ParsedDocument,
  keywords: string[],
  options: { caseSensitive?: boolean; minScore?: number } = {}
): DocumentSection[] {
  const { caseSensitive = false, minScore = 0.3 } = options;

  return doc.sections.filter((section) => {
    if (!section.heading) return false;
    const heading = caseSensitive ? section.heading : section.heading.toLowerCase();
    return keywords.some((kw) => {
      const keyword = caseSensitive ? kw : kw.toLowerCase();
      return heading.includes(keyword) || fuzzyScore(heading, keyword) >= minScore;
    });
  });
}

// Simple fuzzy score based on common subsequence ratio
function fuzzyScore(a: string, b: string): number {
  if (a === b) return 1;
  if (b.length === 0) return 0;
  let matches = 0;
  let bIdx = 0;
  for (let i = 0; i < a.length && bIdx < b.length; i++) {
    if (a[i] === b[bIdx]) {
      matches++;
      bIdx++;
    }
  }
  return matches / b.length;
}

// Extract all text in document that matches a pattern
export function findPatternInDoc(doc: ParsedDocument, pattern: RegExp): RegExpMatchArray[] {
  const results: RegExpMatchArray[] = [];
  const globalPattern = new RegExp(pattern.source, 'gi');
  let match;
  while ((match = globalPattern.exec(doc.raw)) !== null) {
    results.push(match);
  }
  return results;
}

// Get a short excerpt around a position in the raw document
export function getExcerpt(raw: string, start: number, length = 120): string {
  const excerpt = raw.substring(start, start + length).replace(/\n+/g, ' ').trim();
  return excerpt.length < raw.substring(start).length ? excerpt + '…' : excerpt;
}
