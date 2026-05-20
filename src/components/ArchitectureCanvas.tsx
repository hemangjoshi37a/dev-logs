import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  MousePointer2, 
  Type, 
  Bug, 
  GitCommit, 
  Save, 
  Trash2, 
  Layout, 
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchRequests } from '../lib/api';
import { toast } from 'sonner';

type NodeType = 'text' | 'bug' | 'group';

interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string; // for text nodes, it's the text. for bug nodes, it's the request ID
  color?: string;
}

interface CanvasEdge {
  id: string;
  from: string;
  to: string;
}

interface Whiteboard {
  id: string;
  name: string;
  data: {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  };
  updated_at: string;
}

export default function ArchitectureCanvas() {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState('New Architecture Canvas');
  
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  
  // Viewport state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  
  // Tool state
  const [tool, setTool] = useState<'select' | 'text' | 'bug' | 'edge'>('select');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [drawingEdgeFrom, setDrawingEdgeFrom] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Dragging state
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch DevLogs Requests for the "Bug" node tool
  const { data: requests = [] } = useQuery({
    queryKey: ['requests'],
    queryFn: fetchRequests
  });

  // Fetch Whiteboards
  const fetchWhiteboards = async () => {
    try {
      const res = await fetch('http://localhost:4445/api/system/whiteboards');
      const json = await res.json();
      if (json.status === 'success') {
        setWhiteboards(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWhiteboards();
  }, []);

  // Save Whiteboard
  const saveWhiteboard = async () => {
    try {
      const payload = {
        id: currentId,
        name,
        data: { nodes, edges }
      };
      const res = await fetch('http://localhost:4445/api/system/whiteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.status === 'success') {
        setCurrentId(json.data.id);
        toast.success('Canvas saved successfully!');
        fetchWhiteboards();
      }
    } catch (e) {
      toast.error('Failed to save canvas');
    }
  };

  const loadWhiteboard = (wb: Whiteboard) => {
    setCurrentId(wb.id);
    setName(wb.name);
    setNodes(wb.data.nodes || []);
    setEdges(wb.data.edges || []);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const createNew = () => {
    setCurrentId(null);
    setName('New Architecture Canvas');
    setNodes([]);
    setEdges([]);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const deleteWhiteboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this canvas?')) return;
    try {
      await fetch(`http://localhost:4445/api/system/whiteboards/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      if (currentId === id) createNew();
      fetchWhiteboards();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  // Canvas Interactions
  const screenToCanvas = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+Click = Pan
      setIsPanning(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;

    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (tool === 'text') {
      const newNode: CanvasNode = {
        id: `node_${Date.now()}`,
        type: 'text',
        x, y,
        width: 200, height: 100,
        content: 'New Note',
        color: '#3b82f6'
      };
      setNodes([...nodes, newNode]);
      setTool('select');
      setSelectedNode(newNode.id);
    } else if (tool === 'bug') {
      if (requests.length === 0) {
        toast.error('No requests found to link');
        setTool('select');
        return;
      }
      const newNode: CanvasNode = {
        id: `node_${Date.now()}`,
        type: 'bug',
        x, y,
        width: 250, height: 120,
        content: requests[0].id,
        color: '#ef4444'
      };
      setNodes([...nodes, newNode]);
      setTool('select');
      setSelectedNode(newNode.id);
    } else if (tool === 'select') {
      setSelectedNode(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
      return;
    }

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (draggingNode && tool === 'select') {
      setNodes(nodes.map(n => 
        n.id === draggingNode 
          ? { ...n, x: x - dragOffset.current.x, y: y - dragOffset.current.y }
          : n
      ));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    setDraggingNode(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.min(Math.max(0.1, z * zoomFactor), 5));
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    
    if (tool === 'select') {
      setSelectedNode(id);
      setDraggingNode(id);
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const node = nodes.find(n => n.id === id);
      if (node) {
        dragOffset.current = { x: x - node.x, y: y - node.y };
      }
    } else if (tool === 'edge') {
      if (!drawingEdgeFrom) {
        setDrawingEdgeFrom(id);
      } else {
        if (drawingEdgeFrom !== id) {
          // Avoid duplicate edges
          if (!edges.find(edge => edge.from === drawingEdgeFrom && edge.to === id)) {
            setEdges([...edges, { id: `edge_${Date.now()}`, from: drawingEdgeFrom, to: id }]);
          }
        }
        setDrawingEdgeFrom(null);
        setTool('select');
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode && e.target === document.body) { // only if not typing in input
          setNodes(ns => ns.filter(n => n.id !== selectedNode));
          setEdges(es => es.filter(edge => edge.from !== selectedNode && edge.to !== selectedNode));
          setSelectedNode(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  // Render SVG Edges
  const renderEdges = () => {
    const activeEdges = [...edges];
    if (drawingEdgeFrom && tool === 'edge') {
      activeEdges.push({ id: 'temp', from: drawingEdgeFrom, to: 'mouse' });
    }

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {activeEdges.map(edge => {
            const fromNode = nodes.find(n => n.id === edge.from);
            let toNode = nodes.find(n => n.id === edge.to);
            let toX = mousePos.x;
            let toY = mousePos.y;

            if (!fromNode) return null;
            
            const fromX = fromNode.x + fromNode.width / 2;
            const fromY = fromNode.y + fromNode.height / 2;

            if (toNode) {
              toX = toNode.x + toNode.width / 2;
              toY = toNode.y + toNode.height / 2;
            }

            // Simple bezier curve
            const dx = Math.abs(toX - fromX) * 0.5;
            const path = `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;

            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke="#9ca3af"
                strokeWidth={2 / zoom}
                markerEnd="url(#arrow)"
                strokeDasharray={edge.id === 'temp' ? '5,5' : 'none'}
              />
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <div className="flex h-full w-full bg-gray-950 text-gray-200 overflow-hidden font-sans select-none">
      
      {/* Left Sidebar (Saved Boards) */}
      <div className="w-64 border-r border-gray-800 bg-gray-900/80 flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Layout className="w-4 h-4 text-purple-400" />
            Whiteboards
          </h2>
          <button onClick={createNew} className="p-1.5 hover:bg-gray-800 rounded-md text-gray-400 hover:text-white transition-colors" title="New Canvas">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {whiteboards.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No saved boards</div>
          ) : (
            whiteboards.map(wb => (
              <div 
                key={wb.id} 
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${currentId === wb.id ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-gray-800 text-gray-400'}`}
                onClick={() => loadWhiteboard(wb)}
              >
                <div className="truncate text-sm font-medium">{wb.name}</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteWhiteboard(wb.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Toolbar */}
        <div className="h-14 border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-gray-700 focus:border-purple-500 outline-none text-lg font-bold text-white px-1 py-0.5 transition-colors w-64"
            />
            <div className="h-6 w-px bg-gray-800 mx-2"></div>
            
            {/* Tools */}
            <div className="flex bg-gray-950 rounded-lg p-1 border border-gray-800">
              {[
                { id: 'select', icon: MousePointer2, label: 'Select' },
                { id: 'text', icon: Type, label: 'Text Note' },
                { id: 'bug', icon: Bug, label: 'Link Request' },
                { id: 'edge', icon: GitCommit, label: 'Connect' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTool(t.id as any); setDrawingEdgeFrom(null); }}
                  className={`p-1.5 rounded-md mx-0.5 transition-colors ${tool === t.id ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                  title={t.label}
                >
                  <t.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-950 rounded-lg p-1 border border-gray-800 text-gray-400">
              <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-1 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-1 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="p-1 hover:text-white border-l border-gray-800 ml-1 pl-2"><Maximize className="w-4 h-4" /></button>
            </div>
            <button 
              onClick={saveWhiteboard}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        {/* Infinite Canvas */}
        <div 
          ref={canvasRef}
          className="flex-1 relative bg-[#0a0a0a] overflow-hidden cursor-crosshair touch-none"
          style={{ 
            cursor: isPanning ? 'grabbing' : tool === 'select' ? 'default' : tool === 'edge' ? 'crosshair' : 'cell',
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          {renderEdges()}
          
          <div 
            className="absolute inset-0 origin-top-left pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {nodes.map(node => (
              <div
                key={node.id}
                className={`absolute pointer-events-auto rounded-xl shadow-xl border-2 transition-shadow ${selectedNode === node.id ? 'ring-4 ring-purple-500/30 z-50' : 'z-10'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  backgroundColor: '#111827',
                  borderColor: selectedNode === node.id ? '#a855f7' : '#374151',
                  cursor: tool === 'select' ? 'grab' : tool === 'edge' ? 'pointer' : 'default'
                }}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
              >
                {node.type === 'text' && (
                  <div className="w-full h-full flex flex-col">
                    <div className="h-6 bg-gray-800/50 rounded-t-lg border-b border-gray-700/50 flex items-center px-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    </div>
                    <textarea 
                      className="flex-1 bg-transparent p-3 text-sm text-gray-200 outline-none resize-none"
                      value={node.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes(ns => ns.map(n => n.id === node.id ? { ...n, content: val } : n));
                      }}
                      placeholder="Type a note..."
                      onPointerDown={e => e.stopPropagation()} // let user select text
                    />
                  </div>
                )}
                
                {node.type === 'bug' && (
                  <div className="w-full h-full flex flex-col overflow-hidden">
                    <div className="h-6 bg-red-900/30 rounded-t-lg border-b border-red-900/50 flex items-center px-2 gap-2">
                      <Bug className="w-3 h-3 text-red-400" />
                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Request Link</span>
                    </div>
                    <div className="flex-1 p-3 flex flex-col gap-2">
                      <select 
                        className="bg-gray-900 border border-gray-700 rounded text-xs p-1 text-gray-200 outline-none w-full"
                        value={node.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes(ns => ns.map(n => n.id === node.id ? { ...n, content: val } : n));
                        }}
                        onPointerDown={e => e.stopPropagation()}
                      >
                        {requests.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.title.substring(0, 40)}...</option>
                        ))}
                      </select>
                      {requests.find((r: any) => r.id === node.content) && (
                        <div className="text-xs text-gray-400 line-clamp-3">
                          {requests.find((r: any) => r.id === node.content).description.substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
