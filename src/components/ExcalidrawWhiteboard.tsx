import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  PenTool,
  Maximize2,
  Minimize2,
  ExternalLink,
  Users,
  Sparkles,
  Download,
  Trash2,
  Undo2,
  Palette,
  Square,
  Circle as CircleIcon,
  Minus,
  Type,
  Eraser,
  Share2,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';

export const ExcalidrawWhiteboard: React.FC = () => {
  const { settings, activeBoard } = useApp();
  const isDark = settings.theme === 'dark';

  const [mode, setMode] = useState<'excalidraw' | 'local'>('excalidraw');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null);
  const [copiedRoom, setCopiedRoom] = useState(false);

  // Local Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#0C66E4');
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawTool, setDrawTool] = useState<'pen' | 'highlighter' | 'eraser' | 'rect' | 'circle'>('pen');
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);

  // Excalidraw URL with dark/light mode parameter
  const excalidrawUrl = collabRoomId
    ? `https://excalidraw.com/#room=${collabRoomId}`
    : `https://excalidraw.com/${isDark ? '?theme=dark' : '?theme=light'}`;

  // Start live collaboration room
  const handleStartCollaboration = () => {
    Haptics.notification();
    const randomRoom = Math.random().toString(36).substring(2, 12) + ',' + Math.random().toString(36).substring(2, 12);
    setCollabRoomId(randomRoom);
    Notifications.toast('success', '🎨 Live Excalidraw collaboration room started!');
  };

  const handleCopyCollabLink = () => {
    if (!collabRoomId) return;
    const url = `https://excalidraw.com/#room=${collabRoomId}`;
    navigator.clipboard.writeText(url);
    setCopiedRoom(true);
    Notifications.toast('success', '🔗 Excalidraw Live link copied to clipboard!');
    setTimeout(() => setCopiedRoom(false), 2000);
  };

  // Local canvas drawing handlers
  useEffect(() => {
    if (mode === 'local' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.parentElement?.clientWidth || 900;
        canvas.height = canvas.parentElement?.clientHeight || 650;
        ctx.fillStyle = isDark ? '#161A1D' : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [mode, isDark]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save history for undo
    setCanvasHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = drawTool === 'highlighter' ? drawWidth * 4 : drawWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (drawTool === 'eraser') {
      ctx.strokeStyle = isDark ? '#161A1D' : '#FFFFFF';
      ctx.globalAlpha = 1.0;
    } else if (drawTool === 'highlighter') {
      ctx.strokeStyle = drawColor;
      ctx.globalAlpha = 0.3;
    } else {
      ctx.strokeStyle = drawColor;
      ctx.globalAlpha = 1.0;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.closePath();
      setIsDrawing(false);
    }
  };

  const handleUndo = () => {
    if (canvasHistory.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const prev = canvasHistory[canvasHistory.length - 1];
    ctx.putImageData(prev, 0, 0);
    setCanvasHistory(canvasHistory.slice(0, -1));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = isDark ? '#161A1D' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    Haptics.tap();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `dstudy-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    Notifications.toast('success', '📥 Whiteboard exported as PNG!');
  };

  return (
    <div
      className={`w-full max-w-[1550px] mx-auto px-3 sm:px-6 py-4 flex flex-col gap-3 ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-slate-900' : ''
      }`}
      style={isFullscreen ? { background: 'var(--bg-app)' } : { height: 'calc(100vh - 70px)' }}
    >
      {/* ── Whiteboard Toolbar ─────────────────────────────── */}
      <div
        className="p-2 sm:p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 border shadow-xs"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Left: Title & Mode Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {activeBoard?.name || 'Study'} Whiteboard
              </h2>
              <span className="text-[10px] text-slate-400">
                Visual diagrams, mind maps & architecture sketches
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Mode Switcher */}
          <div className="p-0.5 rounded-lg flex items-center gap-1 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => { Haptics.tap(); setMode('excalidraw'); }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'excalidraw' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              ✨ Excalidraw Studio
            </button>
            <button
              onClick={() => { Haptics.tap(); setMode('local'); }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'local' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              🎨 Quick Sketchpad
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {mode === 'excalidraw' && (
            <>
              {collabRoomId ? (
                <button
                  onClick={handleCopyCollabLink}
                  className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                  title="Copy live collaboration link"
                >
                  {copiedRoom ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRoom ? 'Copied!' : 'Copy Collab Link'}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartCollaboration}
                  className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                  title="Start live multi-user drawing session"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Live Collab</span>
                </button>
              )}

              <a
                href={excalidrawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                title="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Tab</span>
              </a>
            </>
          )}

          {mode === 'local' && (
            <>
              {/* Tool Picker */}
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setDrawTool('pen')}
                  className={`p-1 rounded ${drawTool === 'pen' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  title="Pen"
                >
                  <PenTool className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDrawTool('highlighter')}
                  className={`p-1 rounded ${drawTool === 'highlighter' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  title="Highlighter"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDrawTool('eraser')}
                  className={`p-1 rounded ${drawTool === 'eraser' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  title="Eraser"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center gap-1">
                {['#0C66E4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#1E293B'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                    style={{
                      backgroundColor: c,
                      transform: drawColor === c ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: drawColor === c ? '0 0 0 2px var(--bg-card), 0 0 0 3px ' + c : 'none'
                    }}
                  />
                ))}
              </div>

              <button
                onClick={handleUndo}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleClear}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-500"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={handleDownload}
                className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1"
                title="Export as PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PNG</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Canvas / Excalidraw Area ───────────────────────── */}
      <div
        className="flex-1 rounded-xl overflow-hidden border shadow-sm relative"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          minHeight: isFullscreen ? 'calc(100vh - 100px)' : '600px'
        }}
      >
        {mode === 'excalidraw' ? (
          <iframe
            src={excalidrawUrl}
            title="Excalidraw Workspace"
            className="w-full h-full border-0 rounded-xl"
            style={{
              minHeight: isFullscreen ? 'calc(100vh - 110px)' : '620px',
              backgroundColor: isDark ? '#121212' : '#ffffff'
            }}
            allow="clipboard-read; clipboard-write; camera; microphone"
          />
        ) : (
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            className="w-full h-full cursor-crosshair rounded-xl touch-none"
            style={{ minHeight: '620px' }}
          />
        )}
      </div>
    </div>
  );
};
