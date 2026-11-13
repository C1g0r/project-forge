import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import type { ConstitutionModuleMeta, ConstitutionModuleId } from './types';
import {
  generateModule as apiGenerateModule,
  generateModuleStream,
} from '../lib/constitutionApi';
import { getRandomSuggestion } from './suggestions';

interface Props {
  meta: ConstitutionModuleMeta;
}

export function ModuleEditor({ meta }: Props) {
  const {
    modules,
    complexity,
    setModuleInput,
    setModuleStatus,
    setModuleGenerated,
  } = useConstitutionStore();

  const moduleState = modules[meta.id];
  const inputs = moduleState?.inputs ?? {};
  const status = moduleState?.status ?? 'idle';
  const generated = moduleState?.generated ?? '';

  const [streamBuffer, setStreamBuffer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [cancelStream, setCancelStream] = useState<(() => void) | null>(null);

  // Build context from other completed modules
  const buildContext = () => {
    const store = useConstitutionStore.getState();
    const ctx: Record<string, string> = {};
    for (const [id, m] of Object.entries(store.modules)) {
      if (m?.status === 'done' && m.generated && id !== meta.id) {
        ctx[id] = m.generated.slice(0, 400);
      }
    }
    return ctx;
  };

  // Auto-fill a field with a random thematic suggestion
  const handleSuggest = (fieldId: string, placeholder: string | undefined) => {
    const suggestion = getRandomSuggestion(meta.id, fieldId, placeholder);
    if (suggestion) {
      setModuleInput(meta.id, fieldId, suggestion);
    }
  };

  const handleGenerate = async () => {
    setModuleStatus(meta.id, 'generating');
    setStreamBuffer('');
    setIsStreaming(true);

    let accumulated = '';

    const cancel = generateModuleStream(
      {
        moduleId: meta.id,
        inputs,
        context: buildContext(),
        complexity,
      },
      (token) => {
        accumulated += token;
        setStreamBuffer(accumulated);
      },
      () => {
        setIsStreaming(false);
        setModuleGenerated(meta.id, accumulated);
        setCancelStream(null);
      },
      (err) => {
        setIsStreaming(false);
        // Store the error message so it's visible to the user
        setModuleStatus(meta.id, 'error', err);
        setCancelStream(null);
      }
    );

    setCancelStream(() => cancel);
  };

  const handleCancel = () => {
    if (cancelStream) {
      cancelStream();
      setIsStreaming(false);
      setModuleStatus(meta.id, 'idle');
    }
  };

  const displayContent = isStreaming ? streamBuffer : generated;

  return (
    <div className="space-y-5">
      {/* Module header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{meta.icon}</span>
            <h2 className="text-lg font-semibold text-white">{meta.label}</h2>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-zinc-400">{meta.description}</p>
        </div>

        <div className="flex gap-2">
          {isStreaming ? (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-zinc-300 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={status === 'generating'}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded text-xs font-semibold text-zinc-900 transition-colors"
            >
              {status === 'done' ? 'Regenerate' : 'Generate'}
            </button>
          )}
        </div>
      </div>

      {/* Generates label */}
      <div className="flex flex-wrap gap-1.5">
        {meta.generates.map(section => (
          <span key={section} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-500">
            {section}
          </span>
        ))}
      </div>

      {/* Input fields */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Input</div>
        {meta.inputFields.map(field => (
            <div key={field.id}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 font-bold text-amber-400">*</span>
                  )}
                </label>
                {field.required && (
                  <button
                    type="button"
                    onClick={() => handleSuggest(field.id, field.placeholder)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-amber-500/20 border border-zinc-700 hover:border-amber-500/50 rounded text-xs text-zinc-500 hover:text-amber-400 transition-all group"
                    title="Sugestão aleatória temática — clica de novo para outra"
                  >
                    <span className="group-hover:rotate-180 transition-transform duration-300 inline-block">⚡</span>
                    <span>Sugerir</span>
                  </button>
                )}
              </div>

              {field.type === 'select' ? (
                <select
                  value={inputs[field.id] ?? ''}
                  onChange={e => setModuleInput(meta.id, field.id, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="">{field.placeholder}</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' || field.type === 'multiline' ? (
                <textarea
                  value={inputs[field.id] ?? ''}
                  onChange={e => setModuleInput(meta.id, field.id, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-y font-mono"
                />
              ) : (
                <input
                  type="text"
                  value={inputs[field.id] ?? ''}
                  onChange={e => setModuleInput(meta.id, field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-amber-500 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
              )}
            </div>
          ))}
      </div>

      {/* Generated output */}
      {displayContent && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Generated</div>
            <div className="text-xs text-zinc-600 font-mono">
              {displayContent.split('\n').length} lines
              {isStreaming && <span className="text-amber-400 ml-2 animate-pulse">● streaming</span>}
            </div>
          </div>
          <div className="relative">
            <pre className="bg-zinc-950 border border-zinc-800 rounded p-4 text-xs text-zinc-300 overflow-auto max-h-[500px] whitespace-pre-wrap font-mono leading-relaxed">
              {displayContent}
            </pre>
            {!isStreaming && (
              <button
                onClick={() => navigator.clipboard.writeText(displayContent)}
                className="absolute top-2 right-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-400 transition-colors"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {moduleState?.error && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
          {moduleState.error}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs = {
    idle: { label: 'Idle', cls: 'bg-zinc-800 text-zinc-500' },
    generating: { label: 'Generating...', cls: 'bg-amber-900/50 text-amber-300 animate-pulse' },
    done: { label: 'Done', cls: 'bg-emerald-900/50 text-emerald-300' },
    error: { label: 'Error', cls: 'bg-red-900/50 text-red-300' },
  };
  const cfg = configs[status as keyof typeof configs] ?? configs.idle;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
