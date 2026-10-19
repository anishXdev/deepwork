import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  PenTool,
  Square,
  Circle as CircleIcon,
  ArrowRight,
  Minus,
  Type,
  Eraser,
  Download,
  Trash2,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  ExternalLink,
  Users,
  Copy,
  Check,
  MousePointer,
  Sparkles,
  FileDown,
  Layers,
  Palette
} from 'lucide-react';
import { WhiteboardElement, WhiteboardTool } from '../types';
import { StorageService } from '../services/storage';
import { Haptics } from '../utils/haptics';
import { Notifications } from '../services/notifications';

export const ExcalidrawWhiteboard: React.FC = () => {
  const { settings, activeBoard, activeBoardId } = useApp();
  const isDark = settings.theme === 'dark';

  const [mode, setMode] = useState<'offline' | 'cloud'>('offline');
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#0C66E4');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [elements, setElements] = useState<WhiteboardElement[]>(() =>
    StorageService.getWhiteboardElements(activeBoardId)
  );
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardElement[][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inlineText, setInlineText] = useState<{ x: number; y: number; text: string } | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentElementRef = useRef<WhiteboardElement | null>(null);

  // Save elements to storage on change
  useEffect(() => {
    StorageService.saveWhiteboardElements(activeBoardId, elements);
  }, [elements, activeBoardId]);

  // Load elements when active board changes
  useEffect(() => {
    setElements(StorageService.getWhiteboardElements(activeBoardId));
    setHistory([]);
    setRedoStack([]);
  }, [activeBoardId]);

  // Color options
  const colors = [
    '#0C66E4', // Blue
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    isDark ? '#FFFFFF' : '#1E293B', // Monochrome
  ];

  // Render vector elements on the canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = isDark ? '#161A1D' : '#F8FAFC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle grid dots
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const gridSize = 24;
    for (let x = gridSize; x < canvas.width; x += gridSize) {
      for (let y = gridSize; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render all elements
    const validElements = (elements || []).filter((el): el is WhiteboardElement => Boolean(el && typeof el === 'object' && el.id));
    const allElements = currentElementRef.current
      ? [...validElements, currentElementRef.current]
      : validElements;

    allElements.forEach(el => {
      if (!el) return;
      const elColor = el.color || '#0C66E4';
      const elWidth = typeof el.strokeWidth === 'number' ? el.strokeWidth : 3;

      ctx.strokeStyle = elColor;
      ctx.lineWidth = elWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'pen' && el.points && el.points.length > 0) {
        if (el.points.length === 1) {
          ctx.beginPath();
          ctx.fillStyle = elColor;
          ctx.arc(el.points[0].x, el.points[0].y, Math.max(2, elWidth / 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.globalAlpha = 1.0;
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
      } else if (el.type === 'highlighter' && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = elWidth * 4;
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else if (el.type === 'rect') {
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        const w = el.width || 0;
        const h = el.height || 0;
        ctx.strokeRect(el.x, el.y, w, h);
        if (el.fill) {
          ctx.fillStyle = el.fill;
          ctx.fillRect(el.x, el.y, w, h);
        }
      } else if (el.type === 'circle') {
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        const rx = Math.abs(el.width || 0) / 2;
        const ry = Math.abs(el.height || 0) / 2;
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'arrow' || el.type === 'line') {
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        const endX = el.x + (el.width || 0);
        const endY = el.y + (el.height || 0);
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        if (el.type === 'arrow') {
          // Arrowhead
          const angle = Math.atan2(endY - el.y, endX - el.x);
          const headLen = Math.max(10, elWidth * 3.5);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      } else if (el.type === 'text' && el.text) {
        ctx.globalAlpha = 1.0;
        ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillStyle = elColor;
        ctx.fillText(el.text, el.x, el.y);
      }
    });
  }, [elements, isDark]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        const w = container.clientWidth;
        const h = Math.max(650, container.clientHeight);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          renderCanvas();
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Distance from point to line segment
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Comprehensive hit test for eraser against any element type
  const isElementHitByEraser = useCallback((el: WhiteboardElement, ex: number, ey: number, radius = 24): boolean => {
    if (!el) return false;
    const strokeW = typeof el.strokeWidth === 'number' ? el.strokeWidth : 3;
    const hitRadius = radius + strokeW;

    if ((el.type === 'pen' || el.type === 'highlighter') && el.points && el.points.length > 0) {
      if (el.points.length === 1) {
        return Math.hypot(ex - el.points[0].x, ey - el.points[0].y) <= hitRadius * (el.type === 'highlighter' ? 3 : 1.2);
      }
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = el.points[i];
        const p2 = el.points[i + 1];
        const d = distToSegment(ex, ey, p1.x, p1.y, p2.x, p2.y);
        if (d <= hitRadius * (el.type === 'highlighter' ? 3 : 1.2)) {
          return true;
        }
      }
      return false;
    }

    if (el.type === 'line' || el.type === 'arrow') {
      const endX = el.x + (el.width || 0);
      const endY = el.y + (el.height || 0);
      return distToSegment(ex, ey, el.x, el.y, endX, endY) <= hitRadius;
    }

    if (el.type === 'rect') {
      const minX = Math.min(el.x, el.x + (el.width || 0)) - hitRadius;
      const maxX = Math.max(el.x, el.x + (el.width || 0)) + hitRadius;
      const minY = Math.min(el.y, el.y + (el.height || 0)) - hitRadius;
      const maxY = Math.max(el.y, el.y + (el.height || 0)) + hitRadius;
      return ex >= minX && ex <= maxX && ey >= minY && ey <= maxY;
    }

    if (el.type === 'circle') {
      const rx = Math.abs(el.width || 0) / 2 + hitRadius;
      const ry = Math.abs(el.height || 0) / 2 + hitRadius;
      const cx = el.x + (el.width || 0) / 2;
      const cy = el.y + (el.height || 0) / 2;
      if (rx <= 0 || ry <= 0) return Math.hypot(ex - el.x, ey - el.y) <= hitRadius;
      const dx = (ex - cx) / rx;
      const dy = (ey - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }

    if (el.type === 'text') {
      const textLen = (el.text || '').length || 4;
      const approxW = Math.max(50, textLen * 10);
      const minX = el.x - hitRadius;
      const maxX = el.x + approxW + hitRadius;
      const minY = el.y - hitRadius;
      const maxY = el.y + 28 + hitRadius;
      return ex >= minX && ex <= maxX && ey >= minY && ey <= maxY;
    }

    return Math.hypot(ex - (el.x || 0), ey - (el.y || 0)) <= hitRadius;
  }, []);

  // Eraser function with immediate removal and haptic pulse
  const eraseAt = useCallback((x: number, y: number) => {
    setElements(prev => {
      const remaining = (prev || []).filter(el => !isElementHitByEraser(el, x, y));
      if (remaining.length !== (prev || []).length) {
        Haptics.tap();
      }
      return remaining;
    });
  }, [isElementHitByEraser]);

  // Commit typed inline text note
  const commitInlineText = useCallback(() => {
    if (inlineText && inlineText.text.trim()) {
      const newEl: WhiteboardElement = {
        id: 'el_' + Date.now(),
        type: 'text',
        x: inlineText.x,
        y: inlineText.y,
        color: selectedColor,
        strokeWidth,
        text: inlineText.text.trim()
      };
      setHistory(prev => [...prev.slice(-20), elements]);
      setRedoStack([]);
      setElements(prev => [...(prev || []), newEl]);
      Haptics.tap();
    }
    setInlineText(null);
  }, [inlineText, selectedColor, strokeWidth, elements]);

  // Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawingRef.current = true;

    // Push state to undo history
    setHistory(prev => [...prev.slice(-20), elements]);
    setRedoStack([]);

    if (activeTool === 'eraser') {
      eraseAt(x, y);
      return;
    }

    if (activeTool === 'text') {
      // Commit any previously active inline text first
      if (inlineText && inlineText.text.trim()) {
        commitInlineText();
      }
      setInlineText({ x, y, text: '' });
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 40);
      isDrawingRef.current = false;
      return;
    }

    const newElement: WhiteboardElement = {
      id: 'el_' + Date.now(),
      type: activeTool,
      x,
      y,
      width: 0,
      height: 0,
      points: [{ x, y }],
      color: selectedColor,
      strokeWidth
    };

    currentElementRef.current = newElement;
    renderCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      eraseAt(x, y);
      return;
    }

    if (!currentElementRef.current) return;

    const el = currentElementRef.current;
    if (el.type === 'pen' || el.type === 'highlighter') {
      el.points = [...(el.points || []), { x, y }];
    } else {
      el.width = x - el.x;
      el.height = y - el.y;
    }

    renderCanvas();
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (activeTool === 'eraser') {
      isDrawingRef.current = false;
      return;
    }

    if (isDrawingRef.current && currentElementRef.current) {
      const finished = { ...currentElementRef.current };
      currentElementRef.current = null;
      isDrawingRef.current = false;
      setElements(prev => [...(prev || []), finished]);
    } else {
      currentElementRef.current = null;
      isDrawingRef.current = false;
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack(prev => [elements, ...prev]);
    setElements(previous);
    setHistory(prev => prev.slice(0, -1));
    Haptics.tap();
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory(prev => [...prev, elements]);
    setElements(next);
    setRedoStack(prev => prev.slice(1));
    Haptics.tap();
  };

  const handleClear = () => {
    if (elements.length === 0) return;
    if (confirm('Clear the entire whiteboard canvas?')) {
      setHistory(prev => [...prev, elements]);
      setElements([]);
      Haptics.notification();
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${activeBoard?.name || 'whiteboard'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    Notifications.toast('success', '📥 Whiteboard diagram saved as PNG!');
  };

  // Excalidraw Cloud Multiplayer Room
  const handleStartCloudRoom = () => {
    const roomKey = Math.random().toString(36).substring(2, 12);
    setCollabRoomId(roomKey);
    Notifications.toast('success', '🚀 Live Excalidraw cloud room created!');
  };

  const handleCopyCloudLink = () => {
    if (!collabRoomId) return;
    const url = `https://excalidraw.com/#room=${collabRoomId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    Notifications.toast('success', '🔗 Link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      className={`w-full max-w-[1550px] mx-auto px-3 sm:px-6 py-4 flex flex-col gap-3 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-slate-900' : ''
      }`}
      style={isFullscreen ? { background: 'var(--bg-app)' } : { height: 'calc(100vh - 75px)' }}
    >
      {/* ── Toolbar Bar ────────────────────────────────────────── */}
      <div
        className="p-2 sm:p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 border shadow-xs"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Left: Mode & Tool Picker */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode switch */}
          <div className="p-0.5 rounded-lg flex items-center gap-1 bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => { Haptics.tap(); setMode('offline'); }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'offline' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              ⚡ Offline White Board
            </button>
            <button
              onClick={() => { Haptics.tap(); setMode('cloud'); }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                mode === 'cloud' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              ✨ Excalidraw Cloud
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Tools (Offline Mode) */}
          {mode === 'offline' && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('pen'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'pen' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Pen (Draw)"
              >
                <PenTool className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('highlighter'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'highlighter' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Highlighter"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('rect'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'rect' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Rectangle Box"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('circle'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'circle' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Circle / Node"
              >
                <CircleIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('arrow'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'arrow' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Arrow Connection"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('line'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'line' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Straight Line"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('text'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'text' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Text Label"
              >
                <Type className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { Haptics.tap(); setActiveTool('eraser'); }}
                className={`p-1.5 rounded-md transition-all ${
                  activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
                title="Eraser (Click or drag to delete strokes & shapes)"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Palette (Offline Mode) */}
          {mode === 'offline' && (
            <div className="flex items-center gap-1.5">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-125"
                  style={{
                    backgroundColor: c,
                    transform: selectedColor === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: selectedColor === c ? '0 0 0 2px var(--bg-card), 0 0 0 3.5px ' + c : 'none'
                  }}
                />
              ))}

              <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

              {/* Stroke Width Selector */}
              {[2, 4, 8].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setStrokeWidth(w)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    strokeWidth === w ? 'bg-slate-200 dark:bg-slate-700 text-blue-600' : 'text-slate-400'
                  }`}
                >
                  {w}px
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {mode === 'offline' ? (
            <>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 cursor-pointer"
                title="Clear Board"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleExportPNG}
                className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1"
                title="Export Diagram as PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PNG</span>
              </button>
            </>
          ) : (
            <>
              {collabRoomId ? (
                <button
                  onClick={handleCopyCloudLink}
                  className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Collab Link'}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartCloudRoom}
                  className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Live Collab Room</span>
                </button>
              )}
              <a
                href={`https://excalidraw.com/${isDark ? '?theme=dark' : '?theme=light'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Tab</span>
              </a>
            </>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main Canvas View ─────────────────────────────────── */}
      <div
        className="flex-1 rounded-xl overflow-hidden border shadow-sm relative"
        style={{
          background: isDark ? '#161A1D' : '#F8FAFC',
          borderColor: 'var(--border)',
          minHeight: isFullscreen ? 'calc(100vh - 100px)' : '650px'
        }}
      >
        {mode === 'offline' ? (
          <>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full h-full touch-none select-none ${
                activeTool === 'text'
                  ? 'cursor-text'
                  : activeTool === 'eraser'
                  ? 'cursor-cell'
                  : 'cursor-crosshair'
              }`}
              style={{ minHeight: '650px' }}
            />

            {/* Inline floating text input directly on click position */}
            {inlineText && (
              <div
                className="absolute z-30 flex items-center gap-1.5 shadow-2xl rounded-xl p-1.5 border animate-in fade-in zoom-in-95 duration-100"
                style={{
                  left: `${inlineText.x}px`,
                  top: `${inlineText.y}px`,
                  background: isDark ? 'rgba(22, 26, 29, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                  borderColor: 'var(--accent)',
                  backdropFilter: 'blur(8px)',
                  transform: 'translate(0, -6px)'
                }}
              >
                <input
                  ref={textInputRef}
                  type="text"
                  value={inlineText.text}
                  onChange={e => setInlineText(prev => prev ? { ...prev, text: e.target.value } : null)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitInlineText();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setInlineText(null);
                    }
                  }}
                  onBlur={commitInlineText}
                  placeholder="Type text note..."
                  autoFocus
                  className="px-2.5 py-1 text-sm font-bold bg-transparent outline-none"
                  style={{
                    color: selectedColor,
                    minWidth: '180px'
                  }}
                />
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    commitInlineText();
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}
          </>
        ) : (
          <iframe
            src={collabRoomId ? `https://excalidraw.com/#room=${collabRoomId}` : `https://excalidraw.com/${isDark ? '?theme=dark' : '?theme=light'}`}
            title="Excalidraw Cloud Studio"
            className="w-full h-full border-0 rounded-xl"
            style={{
              minHeight: isFullscreen ? 'calc(100vh - 110px)' : '650px',
              backgroundColor: isDark ? '#121212' : '#ffffff'
            }}
            allow="clipboard-read; clipboard-write; camera; microphone"
          />
        )}
      </div>
    </div>
  );
};
