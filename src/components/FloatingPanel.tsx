import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Minus, X, Send, List } from 'lucide-react';
import SubmitTab from './SubmitTab';
import RequestList from './RequestList';
import RequestDetail from './RequestDetail';

const MIN_WIDTH = 380;
const MIN_HEIGHT = 500;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 600;
const STORAGE_KEY = 'dev-logs-panel-state';
const Z_INDEX = 99990;

type ActiveTab = 'submit' | 'requests';
type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

interface PanelState {
  isOpen: boolean;
  isMinimized: boolean;
  activeTab: ActiveTab;
  selectedRequestId: string | null;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

function loadState(): Partial<PanelState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveState(state: Partial<PanelState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function clampPosition(x: number, y: number, w: number, h: number) {
  const maxX = window.innerWidth - 40;
  const maxY = window.innerHeight - 40;
  return {
    x: Math.max(0, Math.min(x, maxX - Math.min(w, 100))),
    y: Math.max(0, Math.min(y, maxY - Math.min(h, 40))),
  };
}

function clampSize(w: number, h: number) {
  const maxW = window.innerWidth * 0.9;
  const maxH = window.innerHeight * 0.9;
  return {
    width: Math.max(MIN_WIDTH, Math.min(w, maxW)),
    height: Math.max(MIN_HEIGHT, Math.min(h, maxH)),
  };
}

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCapture: () => void;
}

export default function FloatingPanel({ isOpen, onClose, onOpenCapture }: FloatingPanelProps) {
  const saved = useRef(loadState()).current;

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(saved.activeTab ?? 'submit');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [position, setPosition] = useState(() => {
    if (saved.position) return saved.position;
    return { x: window.innerWidth - DEFAULT_WIDTH - 20, y: window.innerHeight - DEFAULT_HEIGHT - 80 };
  });
  const [size, setSize] = useState(() => {
    if (saved.size) return clampSize(saved.size.width, saved.size.height);
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  });

  // Dragging
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resizing
  const [resizing, setResizing] = useState<ResizeEdge>(null);
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0, px: 0, py: 0 });

  // Persist position/size/tab
  useEffect(() => {
    saveState({ position, size, activeTab });
  }, [position, size, activeTab]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const newPos = clampPosition(
        e.clientX - dragOffset.current.x,
        e.clientY - dragOffset.current.y,
        size.width,
        size.height,
      );
      setPosition(newPos);
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, size]);

  // Resize handlers
  const onResizeStart = useCallback((edge: ResizeEdge, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(edge);
    resizeStart.current = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      px: e.clientX,
      py: e.clientY,
    };
  }, [position, size]);

  useEffect(() => {
    if (!resizing) return;
    const s = resizeStart.current;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - s.px;
      const dy = e.clientY - s.py;

      let newW = s.width;
      let newH = s.height;
      let newX = s.x;
      let newY = s.y;

      if (resizing.includes('e')) newW = s.width + dx;
      if (resizing.includes('w')) { newW = s.width - dx; newX = s.x + dx; }
      if (resizing.includes('s')) newH = s.height + dy;
      if (resizing.includes('n')) { newH = s.height - dy; newY = s.y + dy; }

      const clamped = clampSize(newW, newH);
      // If clamped, don't move position for that axis
      if (resizing.includes('w') && clamped.width !== newW) {
        newX = s.x + s.width - clamped.width;
      }
      if (resizing.includes('n') && clamped.height !== newH) {
        newY = s.y + s.height - clamped.height;
      }

      setSize(clamped);
      setPosition(clampPosition(newX, newY, clamped.width, clamped.height));
    };
    const onUp = () => setResizing(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  // Edge cursor zones
  const EDGE_SIZE = 8;

  const edgeStyle = (edge: ResizeEdge): React.CSSProperties => {
    const base: React.CSSProperties = { position: 'absolute', zIndex: 2 };
    switch (edge) {
      case 'n': return { ...base, top: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE, cursor: 'ns-resize' };
      case 's': return { ...base, bottom: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE, cursor: 'ns-resize' };
      case 'e': return { ...base, right: 0, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE, cursor: 'ew-resize' };
      case 'w': return { ...base, left: 0, top: EDGE_SIZE, bottom: EDGE_SIZE, width: EDGE_SIZE, cursor: 'ew-resize' };
      case 'ne': return { ...base, top: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nesw-resize' };
      case 'nw': return { ...base, top: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nwse-resize' };
      case 'se': return { ...base, bottom: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nwse-resize' };
      case 'sw': return { ...base, bottom: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2, cursor: 'nesw-resize' };
      default: return base;
    }
  };

  const resizeEdges: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  const handleSwitchToRequests = useCallback((requestId?: string) => {
    setActiveTab('requests');
    if (requestId) setSelectedRequestId(requestId);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={isMinimized
            ? { opacity: 1, scale: 1, y: 0, height: 48 }
            : { opacity: 1, scale: 1, y: 0, height: size.height }
          }
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: size.width,
            zIndex: Z_INDEX,
            overflow: 'hidden',
          }}
          className="rounded-xl shadow-2xl flex flex-col"
        >
          {/* Panel background */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'rgba(10, 15, 30, 0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(6, 182, 212, 0.12)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
          />

          {/* Resize edges */}
          {!isMinimized && resizeEdges.map((edge) => (
            <div
              key={edge}
              style={edgeStyle(edge)}
              onMouseDown={(e) => onResizeStart(edge, e)}
            />
          ))}

          {/* Header bar */}
          <div
            onMouseDown={onDragStart}
            className="relative flex items-center justify-between px-3 h-12 flex-shrink-0 select-none"
            style={{
              cursor: dragging ? 'grabbing' : 'grab',
              borderBottom: '1px solid rgba(6, 182, 212, 0.08)',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.04) 0%, transparent 100%)',
            }}
          >
            {/* Left: icon + title */}
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}
              >
                <Bug size={14} color="#22d3ee" />
              </div>
              <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>Dev Logs</span>
            </div>

            {/* Center: tabs */}
            <div className="flex gap-1 bg-[rgba(15,23,42,0.6)] p-0.5 rounded-lg border border-[rgba(51,65,85,0.4)]">
              <button
                onClick={() => { setActiveTab('submit'); setSelectedRequestId(null); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: activeTab === 'submit' ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: activeTab === 'submit' ? '#22d3ee' : '#64748b',
                }}
              >
                <Send size={11} /> Submit
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: activeTab === 'requests' ? 'rgba(6,182,212,0.15)' : 'transparent',
                  color: activeTab === 'requests' ? '#22d3ee' : '#64748b',
                }}
              >
                <List size={11} /> Requests
              </button>
            </div>

            {/* Right: minimize + close */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(51,65,85,0.5)]"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus size={13} color="#94a3b8" />
              </button>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-[rgba(239,68,68,0.15)]"
                title="Close"
              >
                <X size={13} color="#94a3b8" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {activeTab === 'submit' && (
                <SubmitTab
                  onOpenCapture={onOpenCapture}
                  onSwitchToRequests={handleSwitchToRequests}
                />
              )}
              {activeTab === 'requests' && !selectedRequestId && (
                <RequestList onSelect={(id) => setSelectedRequestId(id)} />
              )}
              {activeTab === 'requests' && selectedRequestId && (
                <RequestDetail
                  requestId={selectedRequestId}
                  onBack={() => setSelectedRequestId(null)}
                />
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
