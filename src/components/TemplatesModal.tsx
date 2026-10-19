import React from 'react';
import { useApp } from '../context/AppContext';
import { STARTER_TEMPLATES, TemplateService, DeepworkTemplate } from '../services/templates';
import { X, Download, FolderDown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const TemplatesModal: React.FC = () => {
  const { isTemplatesModalOpen, setIsTemplatesModalOpen, loadStarterTemplate } = useApp();

  if (!isTemplatesModalOpen) return null;

  const handleDownloadBlank = () => {
    Haptics.tap();
    TemplateService.downloadTemplateAsJson();
  };

  const handleDownloadTemplate = (templateId: string) => {
    Haptics.tap();
    TemplateService.downloadTemplateAsJson(templateId);
  };

  const handleLoad = (templateId: string) => {
    Haptics.success();
    loadStarterTemplate(templateId);
    setIsTemplatesModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <FolderDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Deepwork Starter Templates
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Your workspace stays clean and blank by default. Download or load templates on demand.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBlank}
              className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              title="Download a clean blank JSON template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Blank (.json)</span>
            </button>
            <button
              onClick={() => setIsTemplatesModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          {STARTER_TEMPLATES.map(template => (
            <div
              key={template.id}
              className="p-4 rounded-xl border transition-all hover:border-blue-500/40"
              style={{
                background: 'var(--bg-card-alt)',
                borderColor: 'var(--border)'
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{template.icon}</span>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {template.name}
                    </h3>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {template.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleDownloadTemplate(template.id)}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                    title="Download this template as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>

                  <button
                    onClick={() => handleLoad(template.id)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 font-semibold"
                    title="Apply template tags and cards to current board"
                  >
                    <span>Load Template</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Tags Preview */}
              <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-1">Tags:</span>
                {template.tags.map(t => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                    style={{
                      background: `${t.color}15`,
                      color: t.color,
                      border: `1px solid ${t.color}35`
                    }}
                  >
                    <span>{t.icon}</span>
                    <span>#{t.name}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>💡 You can also create tags directly on the fly by writing <strong>#tag</strong> when adding any card.</span>
          <button
            onClick={() => setIsTemplatesModalOpen(false)}
            className="btn-secondary text-xs px-3 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
