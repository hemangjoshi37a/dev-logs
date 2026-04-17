import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { fetchRequests, type FetchRequestsFilters } from '../lib/api';
import { cn } from '../lib/utils';
import type { DevRequest } from '../types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'Testing' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Submitted', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
  in_progress: { label: 'In Progress', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
  in_testing: { label: 'Testing', className: 'bg-purple-400/10 text-purple-400 border-purple-400/20' },
  completed: { label: 'Completed', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  deferred: { label: 'Deferred', className: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

export const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  medium: { label: 'Medium', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};

function extractUserDescription(request: DevRequest): string {
  const desc = request.description;
  // New format: user text before "---" separator
  const dashSplit = desc.split('\n---\n');
  if (dashSplit.length > 1) return dashSplit[0].trim();
  // Old format: extract from "## Description\n" section
  const descMatch = desc.match(/## Description\n([\s\S]*?)(?:\n##|$)/);
  if (descMatch) return descMatch[1].trim();
  // Fallback: if starts with "## Dev Capture Context", use the title
  if (desc.startsWith('## Dev Capture Context')) return request.title;
  // Plain text
  return desc.trim();
}

interface RequestListProps {
  onSelect: (id: string) => void;
}

export default function RequestList({ onSelect }: RequestListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filters: FetchRequestsFilters = {};
  if (statusFilter) filters.status = statusFilter;

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', filters],
    queryFn: () => fetchRequests(filters),
  });

  let filtered = requests ?? [];
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) => r.description.toLowerCase().includes(q),
    );
  }

  // Sort newest first
  filtered = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter bar */}
      <div className="flex gap-2 p-3 pb-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 rounded-lg text-[12px] outline-none transition-all"
            style={{
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(51,65,85,0.5)',
              color: '#e2e8f0',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.5)'; }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg py-1.5 px-2 text-[11px] outline-none cursor-pointer"
          style={{
            background: 'rgba(15,23,42,0.7)',
            border: '1px solid rgba(51,65,85,0.5)',
            color: '#94a3b8',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div className="px-3 pb-2 flex-shrink-0">
        <span className="text-[10px]" style={{ color: '#64748b' }}>
          {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'rgba(30,41,59,0.3)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen size={28} style={{ color: '#475569', marginBottom: 8 }} />
            <p className="text-[12px]" style={{ color: '#64748b' }}>No requests found</p>
          </div>
        ) : (
          filtered.map((req, i) => (
            <CompactRequestCard key={req.id} request={req} index={i} onClick={() => onSelect(req.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function CompactRequestCard({
  request,
  index,
  onClick,
}: {
  request: DevRequest;
  index: number;
  onClick: () => void;
}) {
  const statusBadge = STATUS_BADGE[request.status] ?? STATUS_BADGE.submitted;
  const priorityBadge = PRIORITY_BADGE[request.priority] ?? PRIORITY_BADGE.medium;
  const checklistTotal = request.checklist?.length ?? 0;
  const checklistDone = request.checklist?.filter((c) => c.checked).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      onClick={onClick}
      className="rounded-lg p-3 cursor-pointer transition-all duration-150"
      style={{
        background: 'rgba(15,23,42,0.4)',
        border: '1px solid rgba(51,65,85,0.3)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)'; e.currentTarget.style.background = 'rgba(15,23,42,0.6)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.3)'; e.currentTarget.style.background = 'rgba(15,23,42,0.4)'; }}
    >
      {/* Description preview — first 2 lines */}
      <div className="text-[12px] mb-1.5 leading-relaxed" style={{ color: '#e2e8f0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {extractUserDescription(request) || request.title}
      </div>
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', priorityBadge.className)}>
          {priorityBadge.label}
        </span>
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ color: '#64748b', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.3)' }}>
          {request.category}
        </span>
        <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', statusBadge.className)}>
          {statusBadge.label}
        </span>
        <span className="text-[9px] ml-auto" style={{ color: '#475569' }}>
          {new Date(request.created_at).toLocaleDateString()}
        </span>
      </div>
    </motion.div>
  );
}
