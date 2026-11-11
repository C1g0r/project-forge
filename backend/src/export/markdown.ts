import type { DocumentBlueprint, Chapter } from "../pipeline/architect.ts";

export function exportToMarkdown(
  blueprint: DocumentBlueprint,
  chapters: Chapter[]
): string {
  const lines: string[] = [];

  // header
  lines.push(`# ${blueprint.title}`);
  lines.push("");
  lines.push(`> **Objectivo:** ${blueprint.objective}`);
  lines.push(`> **Audiência:** ${blueprint.audience}`);
  lines.push(`> **Gerado em:** ${new Date().toLocaleDateString("pt-PT")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // índice
  lines.push("## Índice");
  lines.push("");
  chapters.forEach((ch) => {
    lines.push(`${ch.position}. [${ch.title}](#${slugify(ch.title)})`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");

  // conteúdo
  chapters.forEach((ch) => {
    if (ch.content) {
      lines.push(`## ${ch.title}`);
      lines.push("");
      lines.push(ch.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  });

  return lines.join("\n");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
