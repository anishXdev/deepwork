import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Topic, Subject } from '../types';
import { 
  Play, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Filter, 
  Search, 
  Pause, 
  Sparkles,
  Layers,
  CheckCircle2,
  Clock,
  BookOpen,
  Sliders,
  Settings2,
  Activity
} from 'lucide-react';
import { Haptics } from '../utils/haptics';

export interface PhysicsConfig {
  gravity: number;
  repulsion: number;
  attraction: number;
  linkDistance: number;
  damping: number;
}

const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 0.025,
  repulsion: 380,
  attraction: 0.08,
  linkDistance: 50,
  damping: 0.82,
};

interface GraphNode {
  id: string;
  type: 'subject' | 'topic';
  label: string;
  color: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging?: boolean;
  subjectId?: string;
  topicData?: Topic;
  subjectData?: Subject;
  status?: string;
}

interface GraphLink {
  source: string;
  target: string;
  distance: number;
  strength: number;
}

export const ObsidianGraphView: React.FC = () => {
  const { subjects, topics, setActiveFocusTopic, setActiveTab } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Graph interaction state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPhysicsRunning, setIsPhysicsRunning] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Physics tuning controls
  const [physics, setPhysics] = useState<PhysicsConfig>(DEFAULT_PHYSICS);
  const [showPhysicsDrawer, setShowPhysicsDrawer] = useState<boolean>(false);
  const physicsRef = useRef<PhysicsConfig>(DEFAULT_PHYSICS);

  useEffect(() => {
    physicsRef.current = physics;
  }, [physics]);

  // Mouse / Touch interaction refs
  const dragNodeRef = useRef<GraphNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Build nodes & links
  const { initialNodes, initialLinks } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Filter topics
    let filteredTopics = topics;
    if (statusFilter === 'pending') {
      filteredTopics = filteredTopics.filter(t => t.status !== 'completed');
    } else if (statusFilter === 'completed') {
      filteredTopics = filteredTopics.filter(t => t.status === 'completed');
    }

    if (subjectFilter !== 'all') {
      filteredTopics = filteredTopics.filter(t => t.subjectId === subjectFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredTopics = filteredTopics.filter(t => 
        t.name.toLowerCase().includes(q) || 
        subjects.find(s => s.id === t.subjectId)?.name.toLowerCase().includes(q)
      );
    }

    // Active subjects to include
    const activeSubjectIds = new Set<string>();
    filteredTopics.forEach(t => activeSubjectIds.add(t.subjectId || 'default'));
    if (subjectFilter !== 'all') {
      activeSubjectIds.add(subjectFilter);
    }

    // Include all subjects if no restrictive search is set
    const includedSubjects = searchQuery.trim() || subjectFilter !== 'all' 
      ? subjects.filter(s => activeSubjectIds.has(s.id))
      : subjects;

    // Subject Hub Nodes (arranged in a compact center circle)
    const subjectNodeMap = new Map<string, { x: number; y: number }>();
    includedSubjects.forEach((subject, i) => {
      const angle = (i / Math.max(1, includedSubjects.length)) * Math.PI * 2;
      const dist = 75 + Math.min(80, includedSubjects.length * 10);
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      subjectNodeMap.set(subject.id, { x: sx, y: sy });
      nodes.push({
        id: subject.id,
        type: 'subject',
        label: subject.name,
        color: subject.color || '#14b8a6',
        radius: 18,
        x: sx,
        y: sy,
        vx: 0,
        vy: 0,
        subjectData: subject
      });
    });

    // Group topics by subject for orderly clustered placement
    const topicsBySubj = new Map<string, typeof filteredTopics>();
    filteredTopics.forEach(t => {
      const sId = t.subjectId || 'default';
      if (!topicsBySubj.has(sId)) topicsBySubj.set(sId, []);
      topicsBySubj.get(sId)!.push(t);
    });

    topicsBySubj.forEach((topicList, subjId) => {
      const parentPos = subjectNodeMap.get(subjId) || { x: 0, y: 0 };
      const totalInSubj = topicList.length;

      topicList.forEach((topic, idx) => {
        const sId = topic.subjectId || 'default';
        const parentSubject = subjects.find(s => s.id === sId);
        const subjectColor = parentSubject?.color || '#00f2fe';
        const isDone = topic.status === 'completed';
        
        // Cluster directly next to parent subject at comfortable distance (45-65px)
        const angle = (idx / Math.max(1, totalInSubj)) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const dist = 48 + (idx % 2) * 16;
        const tx = parentPos.x + Math.cos(angle) * dist;
        const ty = parentPos.y + Math.sin(angle) * dist;

        const nodeRadius = isDone ? 10 : Math.min(14, Math.max(8, 8 + (topic.approxHours || 1) * 2));

        nodes.push({
          id: topic.id,
          type: 'topic',
          label: topic.name,
          color: isDone ? '#10b981' : subjectColor,
          radius: nodeRadius,
          x: tx,
          y: ty,
          vx: 0,
          vy: 0,
          subjectId: sId,
          topicData: topic,
          status: topic.status
        });

        // Link topic to its parent subject
        links.push({
          source: topic.id,
          target: sId,
          distance: 52,
          strength: 0.15
        });
      });
    });

    // Link sequential topics within each subject
    const subjectTopicMap = new Map<string, string[]>();
    filteredTopics.forEach(t => {
      const sId = t.subjectId || 'default';
      if (!subjectTopicMap.has(sId)) subjectTopicMap.set(sId, []);
      subjectTopicMap.get(sId)!.push(t.id);
    });

    subjectTopicMap.forEach(topicIds => {
      for (let j = 0; j < topicIds.length - 1; j++) {
        links.push({
          source: topicIds[j],
          target: topicIds[j + 1],
          distance: 55,
          strength: 0.05
        });
      }
    });

    return { initialNodes: nodes, initialLinks: links };
  }, [subjects, topics, statusFilter, subjectFilter, searchQuery]);

  const nodesRef = useRef<GraphNode[]>(initialNodes);
  const linksRef = useRef<GraphLink[]>(initialLinks);

  // Sync ref when props change
  useEffect(() => {
    // Preserve existing positions if possible
    const currentPosMap = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    nodesRef.current.forEach(n => currentPosMap.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }));

    initialNodes.forEach(node => {
      const existing = currentPosMap.get(node.id);
      if (existing) {
        node.x = existing.x;
        node.y = existing.y;
        node.vx = existing.vx;
        node.vy = existing.vy;
      }
    });

    nodesRef.current = initialNodes;
    linksRef.current = initialLinks;
  }, [initialNodes, initialLinks]);

  // Main Canvas & Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const stepSimulation = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const nodeCount = nodes.length;

      if (isPhysicsRunning) {
        const { gravity, repulsion, attraction, linkDistance, damping } = physicsRef.current;

        // Viewport boundaries to ensure nodes NEVER escape
        const boundX = Math.max(120, (width / 2 - 40) / Math.max(0.2, zoom));
        const boundY = Math.max(120, (height / 2 - 40) / Math.max(0.2, zoom));

        // 1. Soft Coulomb Repulsion between nearby nodes
        for (let i = 0; i < nodeCount; i++) {
          for (let j = i + 1; j < nodeCount; j++) {
            const a = nodes[i];
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;

            // Only repel if reasonably close (within 220px) to prevent global outward push
            if (distSq > 0 && distSq < 48400) {
              const dist = Math.sqrt(distSq);
              const repulsionMultiplier = (a.type === 'subject' && b.type === 'subject') ? 1.8 : 1.0;
              // Softened denominator prevents explosive repulsive forces
              const force = (repulsion * repulsionMultiplier) / (distSq + 350);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (!a.isDragging) { a.vx -= fx; a.vy -= fy; }
              if (!b.isDragging) { b.vx += fx; b.vy += fy; }
            }
          }
        }

        // 2. Spring forces along links (Hooke)
        for (let l = 0; l < links.length; l++) {
          const link = links[l];
          const a = nodes.find(n => n.id === link.source);
          const b = nodes.find(n => n.id === link.target);
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const diff = dist - linkDistance;
          const force = diff * attraction;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!a.isDragging) { a.vx += fx; a.vy += fy; }
          if (!b.isDragging) { b.vx += fx; b.vy += fy; }
        }

        // 3. Center gravity & boundary containment (nodes never escape window!)
        const maxV = 2.8;
        for (let i = 0; i < nodeCount; i++) {
          const n = nodes[i];
          if (n.isDragging) continue;

          // Pull to origin
          n.vx -= n.x * gravity;
          n.vy -= n.y * gravity;

          // Soft boundary containment forces
          if (n.x > boundX) {
            n.vx -= (n.x - boundX) * 0.15;
          } else if (n.x < -boundX) {
            n.vx += (-boundX - n.x) * 0.15;
          }
          if (n.y > boundY) {
            n.vy -= (n.y - boundY) * 0.15;
          } else if (n.y < -boundY) {
            n.vy += (-boundY - n.y) * 0.15;
          }

          // Dampening
          n.vx *= damping;
          n.vy *= damping;

          // Clamp velocity to calm, gentle speed
          n.vx = Math.max(-maxV, Math.min(maxV, n.vx));
          n.vy = Math.max(-maxV, Math.min(maxV, n.vy));

          n.x += n.vx;
          n.y += n.vy;

          // Hard safety limit so node can NEVER escape outside visible area
          n.x = Math.max(-boundX * 1.05, Math.min(boundX * 1.05, n.x));
          n.y = Math.max(-boundY * 1.05, Math.min(boundY * 1.05, n.y));
        }
      }

      // Render Canvas
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Pan & Zoom Transform
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
      ctx.scale(zoom, zoom);

      // Render Dot Grid (Obsidian background feel)
      const gridSize = 40;
      const startX = Math.floor((-width / 2 - pan.x) / zoom / gridSize) * gridSize;
      const endX = Math.ceil((width / 2 - pan.x) / zoom / gridSize) * gridSize;
      const startY = Math.floor((-height / 2 - pan.y) / zoom / gridSize) * gridSize;
      const endY = Math.ceil((height / 2 - pan.y) / zoom / gridSize) * gridSize;

      ctx.fillStyle = 'rgba(20, 184, 166, 0.08)';
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        }
      }

      // Active / Connected Node IDs for highlights
      const activeIds = new Set<string>();
      if (hoveredNode) {
        activeIds.add(hoveredNode.id);
        links.forEach(l => {
          if (l.source === hoveredNode.id) activeIds.add(l.target);
          if (l.target === hoveredNode.id) activeIds.add(l.source);
        });
      }

      // Render Links
      links.forEach(l => {
        const a = nodes.find(n => n.id === l.source);
        const b = nodes.find(n => n.id === l.target);
        if (!a || !b) return;

        const isHighlighted = hoveredNode && (activeIds.has(a.id) && activeIds.has(b.id));
        const isDimmed = hoveredNode && !isHighlighted;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);

        if (isHighlighted) {
          ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
          ctx.lineWidth = 2.5;
        } else if (isDimmed) {
          ctx.strokeStyle = 'rgba(15, 45, 75, 0.2)';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'rgba(20, 184, 166, 0.28)';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
      });

      // Render Nodes
      nodes.forEach(node => {
        const isHovered = hoveredNode?.id === node.id;
        const isSelected = selectedNode?.id === node.id;
        const isConnected = activeIds.has(node.id);
        const isDimmed = hoveredNode && !isConnected && !isHovered;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.25 : 1.0;

        // Glowing outer halo for active / hovered / selected nodes
        if (isHovered || isSelected || node.type === 'subject') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + (isHovered ? 8 : 4), 0, Math.PI * 2);
          ctx.fillStyle = node.color + '26';
          ctx.fill();
        }

        // Node Main Body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.type === 'subject') {
          // Solid Glowing Hub
          ctx.fillStyle = node.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Topic Leaf Node
          ctx.fillStyle = node.status === 'completed' ? '#10b981' : '#030a12';
          ctx.fill();
          ctx.strokeStyle = node.color;
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.stroke();
        }

        // Render Labels (Always for Subject hubs; conditionally on zoom or hover for topics)
        const showLabel = node.type === 'subject' || isHovered || isSelected || zoom >= 1.1;
        if (showLabel) {
          ctx.font = node.type === 'subject' ? 'bold 11px Inter, sans-serif' : '9px Inter, sans-serif';
          ctx.fillStyle = node.type === 'subject' ? '#ecfeff' : '#99f6e4';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Background pill for contrast
          const label = node.label.length > 20 ? node.label.substring(0, 18) + '...' : node.label;
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(3, 10, 18, 0.75)';
          ctx.fillRect(node.x - textWidth / 2 - 4, node.y + node.radius + 3, textWidth + 8, 14);

          ctx.fillStyle = node.type === 'subject' ? '#ecfeff' : '#cbd5e1';
          ctx.fillText(label, node.x, node.y + node.radius + 5);
        }

        ctx.restore();
      });

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(stepSimulation);
    };

    animFrameRef.current = requestAnimationFrame(stepSimulation);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPhysicsRunning, zoom, pan, hoveredNode, selectedNode]);

  // Coordinate Conversion (Screen to Canvas World)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Inverse transform
    const worldX = (screenX - canvas.width / 2 - pan.x) / zoom;
    const worldY = (screenY - canvas.height / 2 - pan.y) / zoom;
    return { x: worldX, y: worldY };
  };

  const findNodeAtCoords = (worldX: number, worldY: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = worldX - n.x;
      const dy = worldY - n.y;
      if (dx * dx + dy * dy <= (n.radius + 6) * (n.radius + 6)) {
        return n;
      }
    }
    return null;
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const hitNode = findNodeAtCoords(x, y);

    if (hitNode) {
      Haptics.tap();
      dragNodeRef.current = hitNode;
      hitNode.isDragging = true;
      setSelectedNode(hitNode);
    } else {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (dragNodeRef.current) {
      dragNodeRef.current.x = x;
      dragNodeRef.current.y = y;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
      return;
    }

    if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      });
      return;
    }

    const hit = findNodeAtCoords(x, y);
    setHoveredNode(hit);
  };

  const handleMouseUp = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.isDragging = false;
      dragNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(2.5, Math.max(0.35, prev * factor)));
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const { x, y } = getCanvasCoords(e);
      const hit = findNodeAtCoords(x, y);
      if (hit) {
        Haptics.tap();
        dragNodeRef.current = hit;
        hit.isDragging = true;
        setSelectedNode(hit);
      } else {
        isPanningRef.current = true;
        startPanRef.current = {
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const { x, y } = getCanvasCoords(e);
      if (dragNodeRef.current) {
        dragNodeRef.current.x = x;
        dragNodeRef.current.y = y;
      } else if (isPanningRef.current) {
        setPan({
          x: e.touches[0].clientX - startPanRef.current.x,
          y: e.touches[0].clientY - startPanRef.current.y
        });
      }
    }
  };

  const handleTouchEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.isDragging = false;
      dragNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleResetView = () => {
    Haptics.tap();
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
    nodesRef.current = initialNodes.map(n => ({
      ...n,
      vx: 0,
      vy: 0
    }));
  };

  const handleStartFocusFromNode = (topic: Topic) => {
    Haptics.success();
    setActiveFocusTopic(topic);
    setActiveTab('timer');
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-3xl overflow-hidden border border-teal-500/25 glass-card shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'h-[580px] sm:h-[650px]'
      }`}
    >
      {/* Canvas Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none block bg-[#030a12]"
      />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        
        {/* Left: Search & Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {/* Search Input */}
          <div className="flex items-center px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-teal-500/30 text-xs text-white">
            <Search className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
            <input
              type="text"
              placeholder="Search graph..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-teal-100 placeholder-teal-400/50 w-28 sm:w-36 font-sans"
            />
          </div>

          {/* Subject Filter Dropdown */}
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-teal-500/30 text-xs font-semibold text-teal-200 outline-none cursor-pointer"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-black/60 backdrop-blur-md border border-teal-500/30 text-[11px] font-bold">
            {(['all', 'pending', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2 py-1 rounded-lg capitalize transition-colors ${
                  statusFilter === f ? 'bg-teal-500/30 text-teal-200 border border-teal-400/40' : 'text-slate-400 hover:text-teal-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Simulation Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-black/60 backdrop-blur-md p-1 rounded-xl border border-teal-500/30">
          <button
            onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              isPhysicsRunning ? 'text-teal-400 hover:bg-teal-500/20' : 'text-amber-400 bg-amber-500/20'
            }`}
            title={isPhysicsRunning ? 'Pause Physics' : 'Resume Physics'}
          >
            {isPhysicsRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setZoom(z => Math.min(2.5, z * 1.15))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-teal-500/20 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoom(z => Math.max(0.35, z * 0.85))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-teal-500/20 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowPhysicsDrawer(!showPhysicsDrawer)}
            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
              showPhysicsDrawer ? 'bg-teal-500/40 text-teal-200 border border-teal-400' : 'text-slate-300 hover:text-teal-300 hover:bg-teal-500/20'
            }`}
            title="Adjust Force & Gravity Physics"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-teal-500/20 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-teal-300 hover:bg-teal-500/20 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Physics Forces Tuning Drawer */}
      {showPhysicsDrawer && (
        <div className="absolute top-16 right-3 z-30 w-72 sm:w-80 p-4 rounded-2xl bg-black/90 backdrop-blur-2xl border border-teal-500/40 shadow-2xl space-y-3.5 text-xs text-white animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-bold text-teal-200 text-xs tracking-wide">Force & Physics Settings</span>
            </div>
            <button
              onClick={() => setShowPhysicsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Gravity */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Center Gravity</span>
                <span className="font-mono text-teal-400 font-bold">{physics.gravity.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.060"
                step="0.005"
                value={physics.gravity}
                onChange={e => setPhysics(prev => ({ ...prev, gravity: parseFloat(e.target.value) }))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Free Float</span>
                <span>Strong Centering</span>
              </div>
            </div>

            {/* Repulsion */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Node Repulsion</span>
                <span className="font-mono text-teal-400 font-bold">{physics.repulsion}</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="25"
                value={physics.repulsion}
                onChange={e => setPhysics(prev => ({ ...prev, repulsion: parseInt(e.target.value) }))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Compact</span>
                <span>Spaced</span>
              </div>
            </div>

            {/* Attraction / Spring Stiffness */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Link Attraction (Spring)</span>
                <span className="font-mono text-teal-400 font-bold">{physics.attraction.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.20"
                step="0.01"
                value={physics.attraction}
                onChange={e => setPhysics(prev => ({ ...prev, attraction: parseFloat(e.target.value) }))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Loose</span>
                <span>Tight Bond</span>
              </div>
            </div>

            {/* Link Distance */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Link Distance</span>
                <span className="font-mono text-teal-400 font-bold">{physics.linkDistance}px</span>
              </div>
              <input
                type="range"
                min="35"
                max="150"
                step="5"
                value={physics.linkDistance}
                onChange={e => setPhysics(prev => ({ ...prev, linkDistance: parseInt(e.target.value) }))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Smoothness / Damping */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">Smoothness & Damping</span>
                <span className="font-mono text-teal-400 font-bold">{(physics.damping * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.96"
                step="0.02"
                value={physics.damping}
                onChange={e => setPhysics(prev => ({ ...prev, damping: parseFloat(e.target.value) }))}
                className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Fast Settle</span>
                <span>Fluid Flow</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-teal-500/20 flex items-center justify-between">
            <button
              onClick={() => setPhysics(DEFAULT_PHYSICS)}
              className="text-[10px] font-mono text-teal-400 hover:text-teal-200 underline"
            >
              Reset to Defaults
            </button>
            <span className="text-[10px] text-slate-400 font-mono">
              Live physics
            </span>
          </div>
        </div>
      )}

      {/* Hover Floating Glass Tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="absolute top-16 left-4 pointer-events-none z-10 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-teal-500/30 text-xs text-white shadow-2xl max-w-xs animate-in fade-in">
          <div className="flex items-center space-x-2 mb-1">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: hoveredNode.color }} 
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-teal-400">
              {hoveredNode.type === 'subject' ? 'Subject Hub' : 'Study Topic'}
            </span>
          </div>
          <h4 className="font-bold text-sm text-slate-100">{hoveredNode.label}</h4>
          {hoveredNode.topicData && (
            <div className="mt-1.5 flex items-center space-x-2 text-[11px] text-teal-200/80">
              <span>⏱️ {hoveredNode.topicData.approxHours}h target</span>
              <span>•</span>
              <span className={hoveredNode.status === 'completed' ? 'text-emerald-400 font-bold' : ''}>
                {hoveredNode.status === 'completed' ? '✓ Completed' : 'In Queue'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Inspector Card when a node is selected */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-20 p-4 rounded-2xl bg-black/85 backdrop-blur-xl border border-teal-500/40 text-xs text-white shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-teal-500/20 pb-2">
            <div className="flex items-center space-x-2">
              <span 
                className="w-3 h-3 rounded-full shadow-sm" 
                style={{ backgroundColor: selectedNode.color }} 
              />
              <span className="font-bold text-xs uppercase tracking-wider text-teal-300">
                {selectedNode.type === 'subject' ? 'Subject Hub' : 'Selected Topic'}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div>
            <h3 className="font-black text-sm text-white">{selectedNode.label}</h3>
            {selectedNode.subjectData && (
              <p className="text-[11px] text-teal-400/80 mt-0.5">
                Target: {selectedNode.subjectData.weeklyTargetHours}h / week
              </p>
            )}
            {selectedNode.topicData && (
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Progress: {Math.round(selectedNode.topicData.completedHours * 10) / 10}h / {selectedNode.topicData.approxHours}h</span>
                  <span className={selectedNode.topicData.status === 'completed' ? 'text-emerald-400 font-bold' : 'text-cyan-400'}>
                    {selectedNode.topicData.status === 'completed' ? 'Done' : 'Pending'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                    style={{ 
                      width: `${Math.min(100, ((selectedNode.topicData.completedHours || 0) / (selectedNode.topicData.approxHours || 1)) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {selectedNode.topicData && (
            <button
              onClick={() => handleStartFocusFromNode(selectedNode.topicData!)}
              className="w-full py-2.5 rounded-xl liquid-btn text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg active:scale-95 transition-transform"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Launch Focus Session</span>
            </button>
          )}
        </div>
      )}

      {/* Obsidian-Style Legend in Bottom Left */}
      <div className="absolute bottom-3 left-3 hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-teal-500/20 text-[10px] text-slate-400 pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          Subject Hub
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full border border-teal-400" />
          Pending Topic
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Completed
        </span>
      </div>
    </div>
  );
};

export const NodeGraphView = ObsidianGraphView;

