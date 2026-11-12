import "dotenv/config";
import express from "express";
import cors from "cors";
import { analyzeDocument } from "./pipeline/analyzer.ts";
import { buildBlueprint } from "./pipeline/architect.ts";
import { writeChapter } from "./pipeline/writer.ts";
import { validateDocument } from "./pipeline/validator.ts";
import { exportToMarkdown } from "./export/markdown.ts";
import type { DocumentBlueprint, Chapter } from "./pipeline/architect.ts";

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://project-forge-sandy.vercel.app",
    ];
app.use(
  cors({
    origin: (origin, callback) => {
      // permitir requests sem origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS bloqueado: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// sessões em memória (uso pessoal, sem DB)
const sessions = new Map<
  string,
  {
    blueprint: DocumentBlueprint;
    chapters: Chapter[];
  }
>();

function sessionId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ── ANALYZE ─────────────────────────────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  try {
    const { content } = req.body as { content: string };
    if (!content || content.length < 100) {
      res.status(400).json({ error: "Documento demasiado curto." });
      return;
    }
    const architecture = await analyzeDocument(content);
    res.json({ architecture });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("analyze error:", msg);
    res.status(500).json({ error: "Erro ao analisar documento.", detail: msg });
  }
});

// ── ARCHITECT ────────────────────────────────────────────────────────────────
app.post("/api/architect", async (req, res) => {
  try {
    const { objective, architecture } = req.body;
    if (!objective) {
      res.status(400).json({ error: "Falta objectivo." });
      return;
    }
    const blueprint = await buildBlueprint(objective, architecture);
    const sid = sessionId();
    sessions.set(sid, { blueprint, chapters: [...blueprint.chapters] });
    res.json({ sessionId: sid, blueprint });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("architect error:", msg);
    res.status(500).json({ error: "Erro ao criar blueprint.", detail: msg });
  }
});

// ── UPDATE BLUEPRINT (utilizador editou) ─────────────────────────────────────
app.put("/api/session/:sid/blueprint", (req, res) => {
  const session = sessions.get(req.params.sid);
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }
  session.blueprint = req.body.blueprint;
  session.chapters = req.body.blueprint.chapters;
  res.json({ ok: true });
});

// ── WRITE CHAPTER (streaming SSE) ────────────────────────────────────────────
app.get("/api/session/:sid/write/:chapterId", async (req, res) => {
  const session = sessions.get(req.params.sid);
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }

  const chapter = session.chapters.find((c) => c.id === req.params.chapterId);
  if (!chapter) {
    res.status(404).json({ error: "Capítulo não encontrado." });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  chapter.status = "generating";
  const completedChapters = session.chapters.filter(
    (c) => c.status === "done" && c.content
  );

  try {
    let fullContent = "";
    await writeChapter(
      chapter,
      session.blueprint,
      completedChapters,
      (token) => {
        fullContent += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    );

    chapter.content = fullContent;
    chapter.status = "done";
    res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
    res.end();
  } catch (err) {
    console.error("write error:", err);
    chapter.status = "pending";
    res.write(`data: ${JSON.stringify({ error: "Erro ao escrever capítulo." })}\n\n`);
    res.end();
  }
});

// ── GET SESSION STATE ─────────────────────────────────────────────────────────
app.get("/api/session/:sid", (req, res) => {
  const session = sessions.get(req.params.sid);
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }
  res.json(session);
});

// ── VALIDATE ─────────────────────────────────────────────────────────────────
app.post("/api/session/:sid/validate", async (req, res) => {
  const session = sessions.get(req.params.sid);
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }
  try {
    const report = await validateDocument(
      session.blueprint,
      session.chapters
    );
    res.json({ report });
  } catch (err) {
    console.error("validate error:", err);
    res.status(500).json({ error: "Erro na validação." });
  }
});

// ── EXPORT ───────────────────────────────────────────────────────────────────
app.get("/api/session/:sid/export/markdown", (req, res) => {
  const session = sessions.get(req.params.sid);
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada." });
    return;
  }
  const md = exportToMarkdown(session.blueprint, session.chapters);
  const filename = `${session.blueprint.title.replace(/[^a-z0-9]/gi, "_")}.md`;
  res.setHeader("Content-Type", "text/markdown");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(md);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PROJECT FORGE backend running on http://localhost:${PORT}`);
});
