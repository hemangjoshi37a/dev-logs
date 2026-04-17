export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Category = 'bug' | 'enhancement' | 'feature' | 'ui-ux' | 'ui';
export type Status =
  | 'submitted'
  | 'in_progress'
  | 'in_testing'
  | 'completed'
  | 'deferred'
  | 'cancelled';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size?: number;
  uploaded_at?: string;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface Link {
  id: string;
  label: string;
  url: string;
}

export interface DevRequest {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  category: Category;
  created_at: string;
  updated_at: string;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  links: Link[];
  comments: Comment[];
  submitted_by: string;
  platform: string;
  completion_percentage: number;
  testing_notes: string;
  feedback: string;
}

export interface Stats {
  total: number;
  completed: number;
  in_progress: number;
  in_testing: number;
  pending: number;
}

export interface ChangelogEntry {
  id: string;
  request_id: string;
  request_title: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}
