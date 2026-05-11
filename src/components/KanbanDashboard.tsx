import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, LayoutDashboard, X, Plus, ChevronRight,
  Clock, Tag, AlertCircle, CheckCircle2, Circle, MoreVertical,
  Activity, ArrowRight
} from 'lucide-react';
import { fetchRequests, updateRequest, subscribeToEvents } from '../lib/api';
import type { DevRequest } from '../types';
import { toast } from 'sonner';
import { STATUS_BADGE, PRIORITY_BADGE } from './RequestList';

// Kanban columns configuration
const COLUMNS = [
  { id: 'submitted', label: 'Submitted', color: '#eab308', bgColor: 'rgba(234,179,8,0.1)' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)' },
  { id: 'in_testing', label: 'Testing', color: '#a855f7', bgColor: 'rgba(168,85,247,0.1)' },
  { id: 'completed', label: 'Completed', color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)' },
];

export default function KanbanDashboard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [draggedReqId, setDraggedReqId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Fetch all requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetchRequests(),
  });

  // Setup SSE for real-time board updates
  useEffect(() => {
    const unsubscribe = subscribeToEvents((type, data) => {
      if (['request_created', 'status_change', 'tags_updated'].includes(type)) {
        queryClient.invalidateQueries({ queryKey: ['requests'] });
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    requests.forEach(r => (r.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !(r.description || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeTags.length > 0) {
        if (!r.tags || !activeTags.some(t => r.tags!.includes(t))) {
          return false;
        }
      }
      return true;
    });
  }, [requests, search, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, reqId: string) => {
    setDraggedReqId(reqId);
    e.dataTransfer.setData('text/plain', reqId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag ghost image to make it look nicer
    const el = e.currentTarget as HTMLElement;
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.opacity = '0.8';
    ghost.style.transform = 'rotate(3deg)';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== colId) setDragOverCol(colId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const reqId = e.dataTransfer.getData('text/plain');
    if (!reqId || !draggedReqId) return;

    const req = requests.find(r => r.id === reqId);
    if (!req || req.status === colId) {
      setDraggedReqId(null);
      return;
    }

    // Optimistic UI update
    queryClient.setQueryData(['requests'], (old: DevRequest[] = []) => {
      return old.map(r => r.id === reqId ? { ...r, status: colId } : r);
    });

    try {
      await updateRequest(reqId, { status: colId as DevRequest['status'] });
      toast.success(`Moved to ${COLUMNS.find(c => c.id === colId)?.label}`);
    } catch (err) {
      toast.error('Failed to move request');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    } finally {
      setDraggedReqId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0a0f1e] text-slate-200 flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-cyan-500/20 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/30 flex items-center justify-center">
            <LayoutDashboard size={16} className="text-cyan-400" />
          </div>
          <h1 className="text-lg font-semibold tracking-wide text-slate-100">Dev Logs <span className="text-slate-500 font-normal">Kanban</span></h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 bg-slate-800/50 border border-slate-700 rounded-full py-1.5 pl-9 pr-4 text-sm outline-none focus:border-cyan-500/50 focus:bg-slate-800/80 transition-all"
            />
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Filters */}
        <div className="w-64 border-r border-slate-800 bg-slate-900/30 p-5 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={12} /> Board Stats
            </h3>
            <div className="space-y-2">
              {COLUMNS.map(col => {
                const count = requests.filter(r => r.status === col.id).length;
                return (
                  <div key={col.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      {col.label}
                    </span>
                    <span className="text-slate-500 font-medium">{count}</span>
                  </div>
                )
              })}
              <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between text-sm font-medium">
                <span className="text-slate-300">Total</span>
                <span className="text-cyan-400">{requests.length}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Filter size={12} /> Filter by Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const isActive = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="text-xs px-2.5 py-1 rounded-md transition-all border"
                    style={{
                      background: isActive ? 'rgba(6,182,212,0.15)' : 'rgba(30,41,59,0.5)',
                      borderColor: isActive ? 'rgba(6,182,212,0.5)' : 'rgba(51,65,85,0.5)',
                      color: isActive ? '#22d3ee' : '#94a3b8'
                    }}
                  >
                    #{tag}
                  </button>
                )
              })}
              {allTags.length === 0 && <span className="text-xs text-slate-600 italic">No tags found</span>}
            </div>
          </div>
        </div>

        {/* Board Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#050811] p-6">
          <div className="flex h-full gap-6 items-start min-w-max">
            {COLUMNS.map(col => {
              const colRequests = filteredRequests.filter(r => r.status === col.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              const isOver = dragOverCol === col.id;

              return (
                <div 
                  key={col.id} 
                  className="flex flex-col h-full w-80 shrink-0"
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="font-semibold text-slate-200 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col.color }} />
                      {col.label}
                      <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                        {colRequests.length}
                      </span>
                    </h2>
                    <button className="text-slate-500 hover:text-slate-300 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Column Body */}
                  <div 
                    className="flex-1 overflow-y-auto rounded-xl p-2.5 space-y-3 transition-colors duration-200"
                    style={{ 
                      backgroundColor: isOver ? col.bgColor : 'rgba(15,23,42,0.4)',
                      border: `1px solid ${isOver ? col.color : 'rgba(30,41,59,0.5)'}`
                    }}
                  >
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-slate-800/50 rounded-lg animate-pulse" />)}
                      </div>
                    ) : colRequests.length === 0 ? (
                      <div className="h-24 flex items-center justify-center border border-dashed border-slate-700/50 rounded-lg text-slate-600 text-sm">
                        Drop requests here
                      </div>
                    ) : (
                      <AnimatePresence>
                        {colRequests.map(req => (
                          <KanbanCard 
                            key={req.id} 
                            request={req} 
                            onDragStart={(e) => handleDragStart(e, req.id)}
                            onDragEnd={() => setDraggedReqId(null)}
                            isDragging={draggedReqId === req.id}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Card Component
// ---------------------------------------------------------------------------
function KanbanCard({ 
  request, 
  onDragStart, 
  onDragEnd,
  isDragging 
}: { 
  request: DevRequest; 
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const pBadge = PRIORITY_BADGE[request.priority] || PRIORITY_BADGE.medium;
  const isOverdue = request.due_date && request.status !== 'completed' && new Date(request.due_date) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative group bg-slate-800/80 rounded-xl p-3.5 border cursor-grab active:cursor-grabbing hover:shadow-lg transition-all ${
        isDragging ? 'opacity-40 scale-95 shadow-none border-dashed border-slate-500' : 'border-slate-700 hover:border-slate-600 hover:-translate-y-0.5'
      }`}
      style={{
        boxShadow: isDragging ? 'none' : '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {isOverdue && (
        <div className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-slate-900"></span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">
          {request.id.split('-')[0]}
        </span>
        <button className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-300 transition-opacity">
          <MoreVertical size={14} />
        </button>
      </div>

      <h3 className="text-sm font-medium text-slate-200 mb-2 leading-snug line-clamp-2">
        {request.title}
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${pBadge.className}`}>
          {pBadge.label}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/50 capitalize">
          {request.category}
        </span>
        {(request.tags || []).slice(0, 2).map(tag => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-0.5">
            <Tag size={8} /> {tag}
          </span>
        ))}
        {(request.tags || []).length > 2 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            +{(request.tags || []).length - 2}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-700/50 text-[10px] text-slate-500">
        <div className="flex items-center gap-3">
          {request.due_date ? (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-medium' : ''}`}>
              <Clock size={10} /> 
              {new Date(request.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Circle size={10} /> No due date
            </span>
          )}
          
          {(request.comments?.length ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              💬 {request.comments!.length}
            </span>
          )}
        </div>

        {request.completion_percentage !== undefined && request.completion_percentage > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${request.completion_percentage}%` }}
              />
            </div>
            <span>{request.completion_percentage}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
