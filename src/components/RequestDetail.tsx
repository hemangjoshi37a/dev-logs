import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  Link2,
  Paperclip,
  MessageSquare,
  ListChecks,
  Image,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchRequest,
  updateRequest,
  deleteRequest,
  addChecklist,
  toggleChecklist,
  addComment,
  addLink,
  uploadAttachment,
  updateFeedback,
  updateCompletion,
} from '../lib/api';
import { cn } from '../lib/utils';
import { STATUS_BADGE, PRIORITY_BADGE } from './RequestList';
import type { Status } from '../types';

const ALL_STATUSES: { value: Status; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => fetchRequest(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['request', id] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
    queryClient.invalidateQueries({ queryKey: ['requests-sidebar'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: Status) => updateRequest(id!, { status }),
    onSuccess: () => {
      invalidate();
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const checklistAddMutation = useMutation({
    mutationFn: (text: string) => addChecklist(id!, text),
    onSuccess: () => {
      invalidate();
      setNewChecklistText('');
    },
    onError: () => toast.error('Failed to add checklist item'),
  });

  const checklistToggleMutation = useMutation({
    mutationFn: ({
      checklistId,
      checked,
    }: {
      checklistId: string;
      checked: boolean;
    }) => toggleChecklist(id!, checklistId, checked),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to toggle checklist'),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(id!, newCommentText, newCommentAuthor || 'Anonymous'),
    onSuccess: () => {
      invalidate();
      setNewCommentText('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const linkMutation = useMutation({
    mutationFn: () => addLink(id!, newLinkLabel, newLinkUrl),
    onSuccess: () => {
      invalidate();
      setNewLinkLabel('');
      setNewLinkUrl('');
      toast.success('Link added');
    },
    onError: () => toast.error('Failed to add link'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(id!, file),
    onSuccess: () => {
      invalidate();
      toast.success('Attachment uploaded');
    },
    onError: () => toast.error('Failed to upload attachment'),
  });

  const feedbackMutation = useMutation({
    mutationFn: (data: { testing_notes?: string; feedback?: string }) =>
      updateFeedback(id!, data),
    onSuccess: () => {
      invalidate();
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const completionMutation = useMutation({
    mutationFn: (pct: number) => updateCompletion(id!, pct),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to update completion'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRequest(id!),
    onSuccess: () => {
      toast.success('Request deleted');
      navigate('/requests');
    },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-muted/30 rounded animate-pulse" />
        <div className="h-64 bg-muted/20 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-20">
        <AlertTriangle size={40} className="text-muted-foreground/40 mx-auto mb-4" />
        <p className="text-muted-foreground">Request not found</p>
        <button
          onClick={() => navigate('/requests')}
          className="mt-4 text-primary text-sm hover:underline"
        >
          Back to requests
        </button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[request.status] ?? STATUS_BADGE.submitted;
  const priorityBadge = PRIORITY_BADGE[request.priority] ?? PRIORITY_BADGE.medium;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-20">
      {/* Back + Header */}
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {request.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
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
              <span className="text-[11px] text-muted-foreground/60">
                {new Date(request.created_at).toLocaleString()}
              </span>
              {request.submitted_by && (
                <span className="text-[11px] text-muted-foreground/60">
                  by {request.submitted_by}
                </span>
              )}
            </div>
          </div>

          {/* Status change */}
          <select
            value={request.status}
            onChange={(e) => statusMutation.mutate(e.target.value as Status)}
            className="rounded-lg border border-border bg-card/60 text-xs text-foreground py-2 px-3 focus:outline-none focus:border-primary/40 cursor-pointer"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <Section title="Description" icon={<FileText size={14} />}>
        <div className="text-sm text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed bg-muted/20 rounded-lg p-4 border border-border/30 max-h-[400px] overflow-y-auto">
          {request.description || (
            <span className="text-muted-foreground italic">No description</span>
          )}
        </div>
      </Section>

      {/* Completion */}
      <Section title="Completion" icon={<CheckCircle2 size={14} />}>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={request.completion_percentage}
            onChange={(e) =>
              completionMutation.mutate(Number(e.target.value))
            }
            className="flex-1 accent-primary h-1.5"
          />
          <span className="text-sm font-medium text-foreground w-12 text-right">
            {request.completion_percentage}%
          </span>
        </div>
      </Section>

      {/* Attachments */}
      <Section
        title={`Attachments (${request.attachments?.length ?? 0})`}
        icon={<Image size={14} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {request.attachments?.map((att) => (
            <a
              key={att.id}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-lg border border-border bg-muted/20 overflow-hidden hover:border-primary/30 transition-colors"
            >
              {att.filename.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                <img
                  src={att.url}
                  alt={att.filename}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <Paperclip size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="px-2 py-1.5 truncate text-[11px] text-muted-foreground">
                {att.filename}
              </div>
            </a>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadMutation.mutate(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus size={12} />
          Upload attachment
        </button>
      </Section>

      {/* Checklist */}
      <Section
        title={`Checklist (${request.checklist?.filter((c) => c.checked).length ?? 0}/${request.checklist?.length ?? 0})`}
        icon={<ListChecks size={14} />}
      >
        <div className="space-y-2">
          {request.checklist?.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="flex items-center gap-3 group"
            >
              <button
                onClick={() =>
                  checklistToggleMutation.mutate({
                    checklistId: item.id,
                    checked: !item.checked,
                  })
                }
                className="flex-shrink-0"
              >
                {item.checked ? (
                  <CheckCircle2
                    size={16}
                    className="text-emerald-400"
                  />
                ) : (
                  <Circle
                    size={16}
                    className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                  />
                )}
              </button>
              <span
                className={cn(
                  'text-sm transition-colors',
                  item.checked
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground',
                )}
              >
                {item.text}
              </span>
            </motion.div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newChecklistText.trim())
              checklistAddMutation.mutate(newChecklistText.trim());
          }}
          className="flex items-center gap-2 mt-3"
        >
          <input
            type="text"
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder="Add checklist item..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={!newChecklistText.trim()}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Plus size={14} />
          </button>
        </form>
      </Section>

      {/* Links */}
      <Section
        title={`Links (${request.links?.length ?? 0})`}
        icon={<Link2 size={14} />}
      >
        <div className="space-y-2">
          {request.links?.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink size={12} />
              {link.label || link.url}
            </a>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newLinkUrl.trim())
              linkMutation.mutate();
          }}
          className="flex items-center gap-2 mt-3"
        >
          <input
            type="text"
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Label"
            className="w-28 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
          <button
            type="submit"
            disabled={!newLinkUrl.trim()}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors"
          >
            <Plus size={14} />
          </button>
        </form>
      </Section>

      {/* Comments */}
      <Section
        title={`Comments (${request.comments?.length ?? 0})`}
        icon={<MessageSquare size={14} />}
      >
        <div className="space-y-3">
          {request.comments?.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border/40 bg-muted/15 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground">
                  {comment.author}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {comment.text}
              </p>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newCommentText.trim()) commentMutation.mutate();
          }}
          className="mt-3 space-y-2"
        >
          <input
            type="text"
            value={newCommentAuthor}
            onChange={(e) => setNewCommentAuthor(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full px-3 py-1.5 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </Section>

      {/* Testing Notes */}
      <Section title="Testing Notes" icon={<FileText size={14} />}>
        <textarea
          defaultValue={request.testing_notes}
          onBlur={(e) =>
            feedbackMutation.mutate({ testing_notes: e.target.value })
          }
          placeholder="Notes about testing this request..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none"
        />
      </Section>

      {/* Feedback */}
      <Section title="Feedback" icon={<MessageSquare size={14} />}>
        <textarea
          defaultValue={request.feedback}
          onBlur={(e) =>
            feedbackMutation.mutate({ feedback: e.target.value })
          }
          placeholder="Feedback from stakeholders..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none"
        />
      </Section>

      {/* Delete */}
      <div className="border-t border-border pt-6">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/20 bg-red-500/5">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-foreground flex-1">
              Are you sure you want to delete this request? This cannot be
              undone.
            </span>
            <button
              onClick={() => deleteMutation.mutate()}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded-lg bg-muted/40 text-muted-foreground text-xs font-medium hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Delete request
          </button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
