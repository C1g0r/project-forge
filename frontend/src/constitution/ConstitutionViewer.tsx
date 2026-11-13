import React, { useState } from 'react';
import { useConstitutionStore } from '../store/constitutionStore';
import {
  exportConstitution as apiExport,
  downloadBlob,
} from '../lib/constitutionApi';

export function ConstitutionViewer() {
  const { constitution, projectName } = useConstitutionStore();
  const [copyDone, setCopyDone] = useState(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'txt' | 'json' | 'pdf'>('markdown');
  const [isExporting, setIsExporting] = useState(false);

  if (!constitution) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(constitution.content);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await apiExport(
        constitution.content,
        projectName || 'constitution',
        exportFormat,
      );
      const ext = exportFormat === 'markdown' ? 'md' : exportFormat;
      downloadBlob(blob, `${(projectName || 'constitution').replace(/\s+/g, '-').toLowerCase()}.${ext}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Constitution Document</h2>
          <div className="flex gap-3 text-xs text-zinc-500 mt-1">
            <span>{constitution.lineCount.toLocaleString()} lines</span>
            <span>·</span>
            <span>{constitution.sectionCount} sections</span>
            <span>·</span>
            <span>{constitution.complexity}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as any)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="markdown">Markdown</option>
            <option value="txt">Plain Text</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
          </select>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded text-xs font-semibold text-zinc-900 transition-colors"
          >
            {isExporting ? '◎' : '↓ Export'}
          </button>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 transition-colors"
          >
            {copyDone ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Document content */}
      <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-5 text-xs text-zinc-300 overflow-auto max-h-[calc(100vh-220px)] whitespace-pre-wrap font-mono leading-relaxed">
        {constitution.content}
      </pre>
    </div>
  );
}
