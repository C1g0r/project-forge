/**
 * modules-export.ts
 * Builds PDF and DOCX files from 7-module forge content.
 */

import PDFDocument from "pdfkit";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import type { ModuleInput } from "../pipeline/module-reviewer.ts";

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

// ── PDF ────────────────────────────────────────────────────────────────────

/**
 * Build a PDF buffer from project modules.
 * Uses pdfkit; no native deps.
 */
export async function buildPDF(
  projectName: string,
  modules: ModuleInput[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 70, right: 70 },
      info: {
        Title: projectName,
        Author: "PROJECT FORGE",
        Creator: "PROJECT FORGE v2",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Cover header ──────────────────────────────────────────────────────
    doc
      .fillColor("#e4e4e7") // zinc-200
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(projectName || "Documento", { align: "left" });

    doc
      .fillColor("#71717a") // zinc-500
      .font("Helvetica")
      .fontSize(9)
      .text(`PROJECT FORGE v2  ·  ${new Date().toLocaleDateString("pt-PT")}`, {
        align: "left",
      });

    // Thin rule
    doc.moveDown(0.5);
    doc
      .strokeColor("#3f3f46") // zinc-700
      .lineWidth(0.5)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(1);

    // ── Modules ───────────────────────────────────────────────────────────
    const filledModules = modules.filter((m) => m.content.trim().length > 0);

    for (const mod of filledModules) {
      // Section heading
      doc
        .fillColor("#a1a1aa") // zinc-400
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(mod.label.toUpperCase(), { characterSpacing: 0.8 });

      doc.moveDown(0.3);

      // Content
      doc
        .fillColor("#d4d4d8") // zinc-300
        .font("Helvetica")
        .fontSize(9)
        .text(sanitize(mod.content), {
          lineGap: 3,
          paragraphGap: 4,
        });

      doc.moveDown(1.2);

      // Separator
      if (mod !== filledModules[filledModules.length - 1]) {
        doc
          .strokeColor("#27272a") // zinc-800
          .lineWidth(0.3)
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke();
        doc.moveDown(0.8);
      }
    }

    if (filledModules.length === 0) {
      doc
        .fillColor("#52525b")
        .font("Helvetica-Oblique")
        .fontSize(10)
        .text("Nenhum módulo preenchido.", { align: "center" });
    }

    doc.end();
  });
}

// ── DOCX ───────────────────────────────────────────────────────────────────

/**
 * Build a DOCX buffer from project modules.
 * Uses the `docx` npm package; no native deps.
 */
export async function buildDOCX(
  projectName: string,
  modules: ModuleInput[]
): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: convertInchesToTwip(0.1) },
      children: [
        new TextRun({
          text: projectName || "Documento",
          bold: true,
          size: 44, // 22pt in half-points
          color: "1E1E1E",
        }),
      ],
    })
  );

  // Meta line
  children.push(
    new Paragraph({
      spacing: { after: convertInchesToTwip(0.3) },
      children: [
        new TextRun({
          text: `PROJECT FORGE v2  ·  ${new Date().toLocaleDateString("pt-PT")}`,
          size: 18, // 9pt
          color: "71717A",
        }),
      ],
    })
  );

  // Spacer
  children.push(new Paragraph({ text: "" }));

  const filledModules = modules.filter((m) => m.content.trim().length > 0);

  for (const mod of filledModules) {
    // Module heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.05) },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 2,
            color: "3F3F46",
          },
        },
        children: [
          new TextRun({
            text: mod.label,
            bold: true,
            size: 20, // 10pt
            color: "A1A1AA",
            allCaps: true,
          }),
        ],
      })
    );

    // Content — split on newlines, each paragraph separate
    const lines = sanitize(mod.content).split("\n");
    let currentBlock: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        if (currentBlock.length > 0) {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              children: [
                new TextRun({
                  text: currentBlock.join(" "),
                  size: 18, // 9pt
                  color: "D4D4D8",
                }),
              ],
            })
          );
          currentBlock = [];
        }
      } else {
        currentBlock.push(line);
      }
    }
    if (currentBlock.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [
            new TextRun({
              text: currentBlock.join(" "),
              size: 18,
              color: "D4D4D8",
            }),
          ],
        })
      );
    }

    // Gap between modules
    children.push(new Paragraph({ text: "" }));
  }

  if (filledModules.length === 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Nenhum módulo preenchido.",
            italics: true,
            color: "71717A",
          }),
        ],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 18,
            color: "D4D4D8",
          },
          paragraph: {
            spacing: { line: 276 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.9),
              bottom: convertInchesToTwip(0.9),
              left: convertInchesToTwip(1.1),
              right: convertInchesToTwip(1.1),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
