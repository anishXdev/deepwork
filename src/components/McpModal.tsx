import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Copy, Check, Terminal, Play, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { Haptics } from '../utils/haptics';

export const McpModal: React.FC = () => {
  const { isMcpModalOpen, setIsMcpModalOpen } = useApp();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'antigravity'>('claude');
  const [testTool, setTestTool] = useState<'deepwork_list_tasks' | 'deepwork_create_task' | 'deepwork_get_analytics'>('deepwork_list_tasks');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  if (!isMcpModalOpen) return null;

  const currentDir = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        deepwork: {
          command: "node",
          args: ["/Users/anish/.gemini/antigravity/scratch/study-sync-app/scripts/deepwork-mcp.cjs"]
        }
      }
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        deepwork: {
          url: "http://localhost:5173/api/mcp"
        }
      }
    },
    null,
    2
  );

  const antigravityConfig = JSON.stringify(
    {
      name: "deepwork",
      type: "stdio",
      command: "npm",
      args: ["run", "mcp"]
    },
    null,
    2
  );

  const handleCopy = (text: string, key: string) => {
    Haptics.tap();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunTest = async () => {
    Haptics.tap();
    setIsRunningTest(true);
    setTestOutput(null);

    try {
      let params: any = { name: testTool, arguments: {} };
      if (testTool === 'deepwork_create_task') {
        params.arguments = {
          title: 'Implement MCP live verification #mcp #deepwork',
          approxHours: 1.0,
          priority: 'high',
          notes: 'Tested from MCP in-app hub'
        };
      }

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params
        })
      });

      const json = await res.json();
      setTestOutput(JSON.stringify(json.result || json, null, 2));
      Haptics.success();
    } catch (e: any) {
      setTestOutput(JSON.stringify({ error: e.message || 'Connection failed' }, null, 2));
    } finally {
      setIsRunningTest(false);
    }
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-mono font-bold text-xs">
              MCP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Model Context Protocol (MCP) Hub
                </h2>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Connect Claude Desktop, Cursor, and AI agents directly to your Deepwork cards & boards
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMcpModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Endpoints Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">HTTP / JSON-RPC</span>
              <div className="font-mono text-[11px] font-bold text-blue-500 truncate select-all">
                http://localhost:5173/api/mcp
              </div>
            </div>
            <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Stdio CLI Script</span>
              <div className="font-mono text-[11px] font-bold text-emerald-500 truncate select-all">
                npm run mcp
              </div>
            </div>
          </div>

          {/* Client Configuration Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200">Client Setup Config:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setActiveTab('claude')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                    activeTab === 'claude' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Claude Desktop
                </button>
                <button
                  onClick={() => setActiveTab('cursor')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                    activeTab === 'cursor' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Cursor IDE
                </button>
                <button
                  onClick={() => setActiveTab('antigravity')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                    activeTab === 'antigravity' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Antigravity / Generic
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <pre className="p-3 font-mono text-[11px] overflow-x-auto bg-slate-900 text-slate-200">
                {activeTab === 'claude' && claudeConfig}
                {activeTab === 'cursor' && cursorConfig}
                {activeTab === 'antigravity' && antigravityConfig}
              </pre>
              <button
                onClick={() =>
                  handleCopy(
                    activeTab === 'claude'
                      ? claudeConfig
                      : activeTab === 'cursor'
                      ? cursorConfig
                      : antigravityConfig,
                    'snippet'
                  )
                }
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                title="Copy configuration snippet"
              >
                {copiedKey === 'snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Interactive Tool Tester */}
          <div className="p-3.5 rounded-xl border space-y-2.5" style={{ background: 'var(--bg-card-alt)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-200">Live Tool Execution Test:</span>
              <div className="flex items-center gap-2">
                <select
                  value={testTool}
                  onChange={e => setTestTool(e.target.value as any)}
                  className="input-base text-xs py-1"
                >
                  <option value="deepwork_list_tasks">deepwork_list_tasks</option>
                  <option value="deepwork_create_task">deepwork_create_task (#tags)</option>
                  <option value="deepwork_get_analytics">deepwork_get_analytics</option>
                </select>
                <button
                  onClick={handleRunTest}
                  disabled={isRunningTest}
                  className="btn-primary text-xs px-2.5 py-1 flex items-center gap-1 font-bold disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isRunningTest ? 'Running...' : 'Test Tool'}</span>
                </button>
              </div>
            </div>

            {testOutput && (
              <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-40 border border-slate-800">
                {testOutput}
              </pre>
            )}
          </div>

          {/* Available MCP Tools Catalog */}
          <div className="space-y-1.5 pt-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">Available MCP Tools (6):</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_list_tasks</span>
                <p className="text-[10px] text-slate-400">Filter cards by status, boardId, or tag</p>
              </div>
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_create_task</span>
                <p className="text-[10px] text-slate-400">Add cards with #tags, deadline, priority & duration</p>
              </div>
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_update_task</span>
                <p className="text-[10px] text-slate-400">Mark completed, reschedule date, or edit notes</p>
              </div>
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_get_analytics</span>
                <p className="text-[10px] text-slate-400">Read focus hours, streaks, and completion rates</p>
              </div>
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_list_boards</span>
                <p className="text-[10px] text-slate-400">List boards, active board ID & collaborators</p>
              </div>
              <div className="p-2 rounded-lg border bg-white dark:bg-slate-800/40" style={{ borderColor: 'var(--border)' }}>
                <span className="font-mono font-bold text-blue-500">deepwork_log_focus_session</span>
                <p className="text-[10px] text-slate-400">Log Pomodoro minutes to a card</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <span>Protocol standard: Model Context Protocol (MCP 2024-11-05)</span>
          <button
            onClick={() => setIsMcpModalOpen(false)}
            className="btn-secondary text-xs px-3 py-1"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
