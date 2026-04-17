import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Inbox,
  ArrowUpDown,
  FolderOpen,
} from 'lucide-react';
import { fetchRequests, type FetchRequestsFilters } from '../lib/api';
import { cn } from '../lib/utils';
import type { DevRequest, Status, Priority, Category } from '../types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Priorities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'bug', label: 'Bug' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'feature', label: 'Feature' },
  { value: 'ui-ux', label: 'UI/UX' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'priority', label: 'Priority' },
];

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  submitted: {
    label: 'Submitted',
    className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  },
  in_testing: {
    label: 'Testing',
    className: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  },
  deferred: {
    label: 'Deferred',
    className: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-400/10 text-red-400 border-red-400/20',
  },
};

const PRIORITY_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  critical: {
    label: 'Critical',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
};

export default function RequestList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FetchRequestsFilters>({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', filters],
    queryFn: () => fetchRequests(filters),
  });

  // Client-side search and sort
  let filtered = requests ?? [];

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'newest')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'oldest')
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sort === 'priority') {
      const order: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    }
    return 0;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Status */}
        <FilterSelect
          options={STATUS_OPTIONS}
          value={filters.status ?? ''}
          onChange={(v) =>
            setFilters((f) => ({ ...f, status: v || undefined }))
          }
        />

        {/* Priority */}
        <FilterSelect
          options={PRIORITY_OPTIONS}
          value={filters.priority ?? ''}
          onChange={(v) =>
            setFilters((f) => ({ ...f, priority: v || undefined }))
          }
        />

        {/* Category */}
        <FilterSelect
          options={CATEGORY_OPTIONS}
          value={filters.category ?? ''}
          onChange={(v) =>
            setFilters((f) => ({ ...f, category: v || undefined }))
          }
        />

        {/* Sort */}
        <FilterSelect
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          icon={<ArrowUpDown size={12} />}
        />
      </div>

      {/* Request cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border bg-card/30 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen size={40} className="text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">No requests found</p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Try adjusting your filters or create a new request
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req, i) => (
            <RequestCard
              key={req.id}
              request={req}
              index={i}
              onClick={() => navigate(`/requests/${req.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  index,
  onClick,
}: {
  request: DevRequest;
  index: number;
  onClick: () => void;
}) {
  const statusBadge = STATUS_BADGE[request.status] ?? STATUS_BADGE.submitted;
  const priorityBadge =
    PRIORITY_BADGE[request.priority] ?? PRIORITY_BADGE.medium;

  const checklistTotal = request.checklist?.length ?? 0;
  const checklistDone =
    request.checklist?.filter((c) => c.checked).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      onClick={onClick}
      className="group rounded-xl border border-border bg-card/40 hover:bg-card/70 backdrop-blur-sm p-4 cursor-pointer transition-all duration-150 hover:border-primary/20"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {request.title}
            </span>
            <span className="text-[10px] text-muted-foreground/50 font-mono flex-shrink-0">
              {request.id}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded-md border',
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </span>
            <span
              className={cn(
                'text-[11px] font-medium px-2 py-0.5 rounded-md border',
                priorityBadge.className,
              )}
            >
              {priorityBadge.label}
            </span>
            {request.category && (
              <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50 capitalize">
                {request.category}
              </span>
            )}
            {checklistTotal > 0 && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 size={10} />
                {checklistDone}/{checklistTotal}
              </span>
            )}
          </div>
        </div>

        {/* Right side: completion + date */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {request.completion_percentage > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${request.completion_percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {request.completion_percentage}%
              </span>
            </div>
          )}
          <span className="text-[11px] text-muted-foreground/60">
            {new Date(request.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function FilterSelect({
  options,
  value,
  onChange,
  icon,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none rounded-lg border border-border bg-card/60 text-xs text-foreground py-2 pr-7 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors cursor-pointer',
          icon ? 'pl-7' : 'pl-3',
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { STATUS_BADGE, PRIORITY_BADGE };
