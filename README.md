# PROJECT FORGE v0.1

> Ferramenta para criar documentos completos e autoritários seguindo os padrões arquitecturais de um documento de referência.

## Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS v4 + Zustand
- **Backend**: Express.js + Node 20+ + TypeScript (`--experimental-strip-types`)
- **AI**: Anthropic `claude-sonnet-4-6`

## Arranque rápido

### Pré-requisitos

- Node.js 20+
- Uma [API key da Anthropic](https://console.anthropic.com/)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edita .env e coloca a tua ANTHROPIC_API_KEY
npm install
npm run dev        # porta 3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # porta 5173
```

Abre `http://localhost:5173`

## Pipeline

```
Referência → Analyzer → Architect → Writer (SSE por capítulo) → Validator → Export
```

1. **Upload** — Cola ou arrasta o documento de referência
2. **Objectivo** — Define o que o novo documento deve ser
3. **Índice** — Revê e edita o índice gerado pela AI
4. **Escrita** — Gera capítulos individualmente com streaming em tempo real
5. **Validação** — Analisa contradições, lacunas, repetições
6. **Export** — Descarrega em Markdown

## Estrutura

```
forge/
├── backend/
│   ├── src/
│   │   ├── pipeline/
│   │   │   ├── analyzer.ts     # Extrai arquitectura do doc de referência
│   │   │   ├── architect.ts    # Gera o índice/blueprint
│   │   │   ├── writer.ts       # Escreve capítulos com streaming SSE
│   │   │   └── validator.ts    # Valida o documento completo
│   │   ├── export/
│   │   │   └── markdown.ts     # Exporta para .md
│   │   └── server.ts           # Express API (porta 3001)
│   ├── .env.example
│   └── package.json
└── frontend/
    └── src/
        ├── components/
        │   ├── UploadZone.tsx
        │   ├── ObjectiveInput.tsx
        │   ├── BlueprintEditor.tsx
        │   ├── ChapterEditor.tsx
        │   ├── ValidatorPanel.tsx
        │   ├── ExportPanel.tsx
        │   └── ContextSidebar.tsx
        ├── store/projectStore.ts
        ├── lib/api.ts
        └── App.tsx
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | API key da Anthropic (obrigatório) |
| `PORT` | Porta do backend (default: 3001) |

## Notas

- O backend expõe SSE em `GET /api/session/:sid/write/:chapterId` para streaming de capítulos
- O frontend consome SSE via `EventSource` nativo
- A key nunca deve ser commitada — está no `.gitignore`
