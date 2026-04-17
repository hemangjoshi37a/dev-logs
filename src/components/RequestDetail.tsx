import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ChevronDown,
  ChevronRight,
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
import type { DevRequest, Status } from '../types';

const ALL_STATUSES: { value: Status; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_testing', label: 'In Testing' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

function extractUserDescription(request: DevRequest): string {
  const desc = request.description;
  const dashSplit = desc.split('\n---\n');
  if (dashSplit.length > 1) return dashSplit[0].trim();
  const descMatch = desc.match(/## Description\n([\s\S]*?)(?:\n##|$)/);
  if (descMatch) return descMatch[1].trim();
  if (desc.startsWith('## Dev Capture Context')) return request.title;
  return desc.trim();
}

function extractMetadata(description: string): { page?: string; viewport?: string; browser?: string; timestamp?: string; errors?: string; warnings?: string; highlight?: string; annotations?: string } {
  const meta: Record<string, string> = {};
  const pageMatch = description.match(/\*\*Page\*\*:\s*`([^`]+)`/);
  if (pageMatch) meta.page = pageMatch[1];
  const vpMatch = description.match(/\*\*Viewport\*\*:\s*(\S+)/);
  if (vpMatch) meta.viewport = vpMatch[1];
  const brMatch = description.match(/\*\*Browser\*\*:\s*(.+)/);
  if (brMatch) meta.browser = brMatch[1].trim();
  const tsMatch = description.match(/\*\*Timestamp\*\*:\s*(\S+)/);
  if (tsMatch) meta.timestamp = tsMatch[1];
  const errMatch = description.match(/\*\*Console Errors\*\*:\s*(\d+)/);
  if (errMatch) meta.errors = errMatch[1];
  const warnMatch = description.match(/\*\*Console Warnings\*\*:\s*(\d+)/);
  if (warnMatch) meta.warnings = warnMatch[1];
  return meta;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function authorInitial(name: string): string {
  return (name || 'A').charAt(0).toUpperCase();
}

const INITIAL_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#ec4899', '#3b82f6'];
function authorColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return INITIAL_COLORS[Math.abs(hash) % INITIAL_COLORS.length];
}

interface RequestDetailProps {
  requestId: string;
  onBack: () => void;
}

export default function RequestDetail({ requestId, onBack }: RequestDetailProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);

  const id = requestId;

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => fetchRequest(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['request', id] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: Status) => updateRequest(id, { status }),
    onSuccess: () => { invalidate(); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const checklistAddMutation = useMutation({
    mutationFn: (text: string) => addChecklist(id, text),
    onSuccess: () => { invalidate(); setNewChecklistText(''); },
    onError: () => toast.error('Failed to add checklist item'),
  });

  const checklistToggleMutation = useMutation({
    mutationFn: ({ checklistId, checked }: { checklistId: string; checked: boolean }) =>
      toggleChecklist(id, checklistId, checked),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to toggle checklist'),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(id, newCommentText, newCommentAuthor || 'Anonymous'),
    onSuccess: () => { invalidate(); setNewCommentText(''); toast.success('Comment added'); },
    onError: () => toast.error('Failed to add comment'),
  });

  const linkMutation = useMutation({
    mutationFn: () => addLink(id, newLinkLabel, newLinkUrl),
    onSuccess: () => { invalidate(); setNewLinkLabel(''); setNewLinkUrl(''); toast.success('Link added'); },
    onError: () => toast.error('Failed to add link'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(id, file),
    onSuccess: () => { invalidate(); toast.success('Attachment uploaded'); },
    onError: () => toast.error('Failed to upload attachment'),
  });

  const feedbackMutation = useMutation({
    mutationFn: (data: { testing_notes?: string; feedback?: string }) => updateFeedback(id, data),
    onSuccess: () => { invalidate(); toast.success('Saved'); },
    onError: () => toast.error('Failed to save'),
  });

  const completionMutation = useMutation({
    mutationFn: (pct: number) => updateCompletion(id, pct),
    onSuccess: () => invalidate(),
    onError: () => toast.error('Failed to update completion'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRequest(id),
    onSuccess: () => { toast.success('Request deleted'); onBack(); },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) {
    return (
      <div className="p-2.5 space-y-2">
        <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(30,41,59,0.5)' }} />
        <div className="h-32 rounded-lg animate-pulse" style={{ background: 'rgba(30,41,59,0.3)' }} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-2.5 text-center py-10">
        <AlertTriangle size={24} style={{ color: '#475569', margin: '0 auto 6px' }} />
        <p className="text-[11px]" style={{ color: '#64748b' }}>Request not found</p>
        <button onClick={onBack} className="mt-2 text-[10px]" style={{ color: '#22d3ee' }}>Back to list</button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[request.status] ?? STATUS_BADGE.submitted;
  const priorityBadge = PRIORITY_BADGE[request.priority] ?? PRIORITY_BADGE.medium;
  const userDesc = extractUserDescription(request);
  const heading = userDesc.split('\n')[0].slice(0, 120) || request.title;
  const metadata = extractMetadata(request.description);
  const hasMetadata = Object.keys(metadata).length > 0;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(51,65,85,0.5)',
    color: '#e2e8f0',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-2.5 space-y-0">
      {/* Back + header */}
      <div className="pb-2.5">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[10px] transition-colors mb-2"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          <ArrowLeft size={11} /> Back
        </button>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[13px] font-semibold leading-snug mb-1.5" style={{ color: '#e2e8f0' }}>{heading}</h2>
            <div className="flex flex-wrap items-center gap-1">
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', statusBadge.className)}>{statusBadge.label}</span>
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', priorityBadge.className)}>{priorityBadge.label}</span>
              {request.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: '#64748b', background: 'rgba(30,41,59,0.4)' }}>
                  {request.category}
                </span>
              )}
              <span className="text-[9px] ml-auto" style={{ color: '#475569' }}>{relativeTime(request.created_at)}</span>
            </div>
          </div>

          <select
            value={request.status}
            onChange={(e) => statusMutation.mutate(e.target.value as Status)}
            className="rounded py-0.5 px-1.5 text-[10px] outline-none cursor-pointer flex-shrink-0"
            style={{ ...inputStyle, borderColor: 'rgba(51,65,85,0.35)' }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>Description</h3>
        <div className="text-[12px] whitespace-pre-wrap font-mono leading-relaxed" style={{ color: '#cbd5e1' }}>
          {userDesc || <span style={{ color: '#475569', fontStyle: 'italic' }}>No description</span>}
        </div>
        {hasMetadata && (
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="flex items-center gap-1 mt-2 text-[10px] transition-colors"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            {contextExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Context
          </button>
        )}
        {contextExpanded && hasMetadata && (
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono pl-1" style={{ color: '#475569' }}>
            {metadata.page && <><span>Page</span><span style={{ color: '#64748b' }}>{metadata.page}</span></>}
            {metadata.viewport && <><span>Viewport</span><span style={{ color: '#64748b' }}>{metadata.viewport}</span></>}
            {metadata.browser && <><span>Browser</span><span className="truncate" style={{ color: '#64748b' }}>{metadata.browser.slice(0, 40)}</span></>}
            {metadata.timestamp && <><span>Time</span><span style={{ color: '#64748b' }}>{new Date(metadata.timestamp).toLocaleString()}</span></>}
            {metadata.errors && <><span>Errors</span><span style={{ color: metadata.errors !== '0' ? '#ef4444' : '#64748b' }}>{metadata.errors}</span></>}
            {metadata.warnings && <><span>Warnings</span><span style={{ color: metadata.warnings !== '0' ? '#f59e0b' : '#64748b' }}>{metadata.warnings}</span></>}
          </div>
        )}
      </div>

      {/* Completion */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>Completion</h3>
          <input
            type="range" min={0} max={100} step={5}
            value={request.completion_percentage}
            onChange={(e) => completionMutation.mutate(Number(e.target.value))}
            className="flex-1 accent-[#22d3ee] h-1"
          />
          <span className="text-[11px] font-medium w-8 text-right tabular-nums" style={{ color: '#e2e8f0' }}>
            {request.completion_percentage}%
          </span>
        </div>
      </div>

      {/* Attachments */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>
          Attachments ({request.attachments?.length ?? 0})
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {request.attachments?.map((att) => (
            <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
              title={att.filename}
              className="rounded overflow-hidden transition-all flex-shrink-0"
              style={{ width: 40, height: 40, border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(6,182,212,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(51,65,85,0.3)'; }}
            >
              {att.filename.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                <img src={att.url} alt={att.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Paperclip size={12} style={{ color: '#475569' }} />
                </div>
              )}
            </a>
          ))}
        </div>
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current?.click()}
          className="mt-1.5 flex items-center gap-1 text-[10px] px-2 py-1 transition-colors"
          style={{ color: '#22d3ee' }}><Plus size={10} /> Upload</button>
      </div>

      {/* Checklist */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>
          Checklist ({request.checklist?.filter((c) => c.checked).length ?? 0}/{request.checklist?.length ?? 0})
        </h3>
        <div className="space-y-1">
          {request.checklist?.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <button onClick={() => checklistToggleMutation.mutate({ checklistId: item.id, checked: !item.checked })} className="flex-shrink-0">
                {item.checked
                  ? <CheckCircle2 size={12} color="#34d399" />
                  : <Circle size={12} style={{ color: '#475569' }} />
                }
              </button>
              <span className={cn('text-[12px]', item.checked ? 'line-through' : '')}
                style={{ color: item.checked ? '#475569' : '#e2e8f0' }}>{item.text}</span>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newChecklistText.trim()) checklistAddMutation.mutate(newChecklistText.trim()); }}
          className="flex gap-1.5 mt-1.5">
          <input type="text" value={newChecklistText} onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder="Add item..." className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={inputStyle} />
          <button type="submit" disabled={!newChecklistText.trim()}
            className="text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Plus size={11} /></button>
        </form>
      </div>

      {/* Links */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>
          Links ({request.links?.length ?? 0})
        </h3>
        <div className="space-y-0.5">
          {request.links?.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] transition-colors" style={{ color: '#22d3ee' }}>
              <ExternalLink size={9} /> {link.label || link.url}
            </a>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newLinkUrl.trim()) linkMutation.mutate(); }} className="flex gap-1.5 mt-1.5">
          <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Label" className="w-20 px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={inputStyle} />
          <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="https://..." className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={inputStyle} />
          <button type="submit" disabled={!newLinkUrl.trim()}
            className="text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Plus size={11} /></button>
        </form>
      </div>

      {/* Comments */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>
          Comments ({request.comments?.length ?? 0})
        </h3>
        <div className="space-y-2">
          {request.comments?.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: authorColor(comment.author), color: '#fff' }}
              >
                {authorInitial(comment.author)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[10px] font-medium" style={{ color: '#e2e8f0' }}>{comment.author}</span>
                  <span className="text-[9px]" style={{ color: '#475569' }}>{relativeTime(comment.created_at)}</span>
                </div>
                <p className="text-[11px] whitespace-pre-wrap leading-relaxed" style={{ color: '#94a3b8' }}>{comment.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newCommentText.trim()) commentMutation.mutate(); }} className="mt-2 space-y-1">
          <input type="text" value={newCommentAuthor} onChange={(e) => setNewCommentAuthor(e.target.value)}
            placeholder="Name (optional)" className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none" style={inputStyle} />
          <div className="flex gap-1.5">
            <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Comment..." rows={2}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-[12px] outline-none resize-none" style={inputStyle} />
            <button type="submit" disabled={!newCommentText.trim()}
              className="text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-30 self-end"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Send size={11} /></button>
          </div>
        </form>
      </div>

      {/* Testing Notes */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>Testing Notes</h3>
        <textarea defaultValue={request.testing_notes}
          onBlur={(e) => feedbackMutation.mutate({ testing_notes: e.target.value })}
          placeholder="Testing notes..." rows={2}
          className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none resize-none" style={inputStyle} />
      </div>

      {/* Feedback */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#64748b' }}>Feedback</h3>
        <textarea defaultValue={request.feedback}
          onBlur={(e) => feedbackMutation.mutate({ feedback: e.target.value })}
          placeholder="Feedback..." rows={2}
          className="w-full px-2.5 py-1.5 rounded-lg text-[12px] outline-none resize-none" style={inputStyle} />
      </div>

      {/* Delete */}
      <div className="py-2.5 border-t border-[rgba(51,65,85,0.2)]">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(127,29,29,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={11} color="#ef4444" />
            <span className="text-[10px] flex-1" style={{ color: '#e2e8f0' }}>Delete this request?</span>
            <button onClick={() => deleteMutation.mutate()}
              className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Delete</button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(51,65,85,0.3)', color: '#94a3b8' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 transition-colors"
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#ef4444'; }}
          >
            <Trash2 size={10} /> Delete request
          </button>
        )}
      </div>
    </div>
  );
}
