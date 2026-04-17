import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { fetchRequests, fetchChangelog } from '../lib/api';
import { cn } from '../lib/utils';
import type { DevRequest, ChangelogEntry } from '../types';

const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Requests',
    icon: BarChart3,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    filter: () => true,
  },
  {
    key: 'open',
    label: 'Open',
    icon: Inbox,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
    filter: (r: DevRequest) => r.status === 'submitted',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    filter: (r: DevRequest) => r.status === 'in_progress',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    filter: (r: DevRequest) => r.status === 'completed',
  },
];

export default function StatsOverview() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetchRequests(),
  });

  const { data: changelog } = useQuery({
    queryKey: ['changelog'],
    queryFn: () => fetchChangelog(undefined, 20),
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of development requests and activity
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => {
          const count = isLoading
            ? '--'
            : requests?.filter(card.filter).length ?? 0;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className={cn(
                'rounded-xl border p-5',
                'bg-card/60 backdrop-blur-sm',
                card.border,
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center',
                    card.bg,
                  )}
                >
                  <card.icon size={18} className={card.color} />
                </div>
              </div>
              <div className={cn('text-3xl font-bold', card.color)}>
                {count}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {card.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-border/50">
          {!changelog || changelog.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No recent activity
            </div>
          ) : (
            changelog.slice(0, 10).map((entry: ChangelogEntry, i: number) => (
              <motion.div
                key={entry.id ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground font-medium truncate block">
                    {entry.request_title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="capitalize">{entry.field}</span> changed
                    {entry.new_value ? (
                      <>
                        {' '}
                        <ArrowRight
                          size={10}
                          className="inline text-muted-foreground/60"
                        />{' '}
                        <span className="text-primary/80">
                          {entry.new_value}
                        </span>
                      </>
                    ) : null}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground/60 flex-shrink-0">
                  {formatRelativeTime(entry.changed_at)}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}
