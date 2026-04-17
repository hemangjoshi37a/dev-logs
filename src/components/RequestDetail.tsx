import { useState, useRef } from 'react';
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
      <div className="p-4 space-y-3">
        <div className="h-5 w-32 rounded animate-pulse" style={{ background: 'rgba(30,41,59,0.5)' }} />
        <div className="h-40 rounded-lg animate-pulse" style={{ background: 'rgba(30,41,59,0.3)' }} />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-4 text-center py-12">
        <AlertTriangle size={28} style={{ color: '#475569', margin: '0 auto 8px' }} />
        <p className="text-[12px]" style={{ color: '#64748b' }}>Request not found</p>
        <button onClick={onBack} className="mt-3 text-[11px]" style={{ color: '#22d3ee' }}>Back to list</button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[request.status] ?? STATUS_BADGE.submitted;
  const priorityBadge = PRIORITY_BADGE[request.priority] ?? PRIORITY_BADGE.medium;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(15,23,42,0.7)',
    border: '1px solid rgba(51,65,85,0.5)',
    color: '#e2e8f0',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3">
      {/* Back + title */}
      <div className="space-y-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
        >
          <ArrowLeft size={12} /> Back
        </button>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold truncate" style={{ color: '#e2e8f0' }}>{request.title}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', statusBadge.className)}>{statusBadge.label}</span>
              <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded border', priorityBadge.className)}>{priorityBadge.label}</span>
              {request.category && (
                <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ color: '#64748b', background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(51,65,85,0.3)' }}>
                  {request.category}
                </span>
              )}
              <span className="text-[9px]" style={{ color: '#475569' }}>{new Date(request.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <select
            value={request.status}
            onChange={(e) => statusMutation.mutate(e.target.value as Status)}
            className="rounded-lg py-1 px-2 text-[10px] outline-none cursor-pointer flex-shrink-0"
            style={inputStyle}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <Section title="Description" icon={<FileText size={12} />}>
        <div className="text-[11px] whitespace-pre-wrap font-mono leading-relaxed p-2.5 rounded-lg max-h-[200px] overflow-y-auto"
          style={{ color: '#cbd5e1', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.3)' }}>
          {request.description || <span style={{ color: '#475569', fontStyle: 'italic' }}>No description</span>}
        </div>
      </Section>

      {/* Completion */}
      <Section title="Completion" icon={<CheckCircle2 size={12} />}>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={100} step={5}
            value={request.completion_percentage}
            onChange={(e) => completionMutation.mutate(Number(e.target.value))}
            className="flex-1 accent-[#22d3ee] h-1"
          />
          <span className="text-[11px] font-medium w-9 text-right" style={{ color: '#e2e8f0' }}>
            {request.completion_percentage}%
          </span>
        </div>
      </Section>

      {/* Attachments */}
      <Section title={`Attachments (${request.attachments?.length ?? 0})`} icon={<Image size={12} />}>
        <div className="grid grid-cols-3 gap-2">
          {request.attachments?.map((att) => (
            <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
              className="rounded-lg overflow-hidden transition-colors"
              style={{ border: '1px solid rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.3)' }}>
              {att.filename.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) ? (
                <img src={att.url} alt={att.filename} className="w-full h-16 object-cover" />
              ) : (
                <div className="w-full h-16 flex items-center justify-center">
                  <Paperclip size={14} style={{ color: '#475569' }} />
                </div>
              )}
              <div className="px-1.5 py-1 truncate text-[9px]" style={{ color: '#64748b' }}>{att.filename}</div>
            </a>
          ))}
        </div>
        <input ref={fileInputRef} type="file" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = ''; }} />
        <button onClick={() => fileInputRef.current?.click()}
          className="mt-1.5 flex items-center gap-1 text-[10px] transition-colors"
          style={{ color: '#22d3ee' }}><Plus size={10} /> Upload</button>
      </Section>

      {/* Checklist */}
      <Section title={`Checklist (${request.checklist?.filter((c) => c.checked).length ?? 0}/${request.checklist?.length ?? 0})`} icon={<ListChecks size={12} />}>
        <div className="space-y-1.5">
          {request.checklist?.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button onClick={() => checklistToggleMutation.mutate({ checklistId: item.id, checked: !item.checked })} className="flex-shrink-0">
                {item.checked
                  ? <CheckCircle2 size={13} color="#34d399" />
                  : <Circle size={13} style={{ color: '#475569' }} />
                }
              </button>
              <span className={cn('text-[11px]', item.checked ? 'line-through' : '')}
                style={{ color: item.checked ? '#475569' : '#e2e8f0' }}>{item.text}</span>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newChecklistText.trim()) checklistAddMutation.mutate(newChecklistText.trim()); }}
          className="flex gap-1.5 mt-2">
          <input type="text" value={newChecklistText} onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder="Add item..." className="flex-1 px-2 py-1 rounded-lg text-[11px] outline-none" style={inputStyle} />
          <button type="submit" disabled={!newChecklistText.trim()}
            className="p-1 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Plus size={12} /></button>
        </form>
      </Section>

      {/* Links */}
      <Section title={`Links (${request.links?.length ?? 0})`} icon={<Link2 size={12} />}>
        <div className="space-y-1">
          {request.links?.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] transition-colors" style={{ color: '#22d3ee' }}>
              <ExternalLink size={10} /> {link.label || link.url}
            </a>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newLinkUrl.trim()) linkMutation.mutate(); }} className="flex gap-1.5 mt-2">
          <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Label" className="w-20 px-2 py-1 rounded-lg text-[11px] outline-none" style={inputStyle} />
          <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="https://..." className="flex-1 px-2 py-1 rounded-lg text-[11px] outline-none" style={inputStyle} />
          <button type="submit" disabled={!newLinkUrl.trim()}
            className="p-1 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Plus size={12} /></button>
        </form>
      </Section>

      {/* Comments */}
      <Section title={`Comments (${request.comments?.length ?? 0})`} icon={<MessageSquare size={12} />}>
        <div className="space-y-2">
          {request.comments?.map((comment) => (
            <div key={comment.id} className="rounded-lg p-2" style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(51,65,85,0.25)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium" style={{ color: '#e2e8f0' }}>{comment.author}</span>
                <span className="text-[9px]" style={{ color: '#475569' }}>{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[11px] whitespace-pre-wrap" style={{ color: '#94a3b8' }}>{comment.text}</p>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newCommentText.trim()) commentMutation.mutate(); }} className="mt-2 space-y-1.5">
          <input type="text" value={newCommentAuthor} onChange={(e) => setNewCommentAuthor(e.target.value)}
            placeholder="Name (optional)" className="w-full px-2 py-1 rounded-lg text-[11px] outline-none" style={inputStyle} />
          <div className="flex gap-1.5">
            <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Comment..." rows={2}
              className="flex-1 px-2 py-1.5 rounded-lg text-[11px] outline-none resize-none" style={inputStyle} />
            <button type="submit" disabled={!newCommentText.trim()}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 self-end"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee' }}><Send size={12} /></button>
          </div>
        </form>
      </Section>

      {/* Testing Notes */}
      <Section title="Testing Notes" icon={<FileText size={12} />}>
        <textarea defaultValue={request.testing_notes}
          onBlur={(e) => feedbackMutation.mutate({ testing_notes: e.target.value })}
          placeholder="Testing notes..." rows={2}
          className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none resize-none" style={inputStyle} />
      </Section>

      {/* Feedback */}
      <Section title="Feedback" icon={<MessageSquare size={12} />}>
        <textarea defaultValue={request.feedback}
          onBlur={(e) => feedbackMutation.mutate({ feedback: e.target.value })}
          placeholder="Feedback..." rows={2}
          className="w-full px-2 py-1.5 rounded-lg text-[11px] outline-none resize-none" style={inputStyle} />
      </Section>

      {/* Delete */}
      <div className="pt-2" style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(127,29,29,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={12} color="#ef4444" />
            <span className="text-[11px] flex-1" style={{ color: '#e2e8f0' }}>Delete this request?</span>
            <button onClick={() => deleteMutation.mutate()}
              className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>Delete</button>
            <button onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 rounded-md text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(51,65,85,0.4)', color: '#94a3b8' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 text-[10px] transition-colors"
            style={{ color: '#64748b' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            <Trash2 size={10} /> Delete request
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(15,23,42,0.2)', border: '1px solid rgba(51,65,85,0.25)' }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid rgba(51,65,85,0.2)' }}>
        <span style={{ color: '#22d3ee' }}>{icon}</span>
        <h3 className="text-[11px] font-semibold" style={{ color: '#e2e8f0' }}>{title}</h3>
      </div>
      <div className="p-2.5">{children}</div>
    </div>
  );
}
