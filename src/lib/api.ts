import type {
  DevRequest,
  Stats,
  ChangelogEntry,
  ChecklistItem,
  Comment,
  Link,
} from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------- Requests ----------

export interface FetchRequestsFilters {
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  sort?: string;
}

export async function fetchRequests(
  filters?: FetchRequestsFilters,
): Promise<DevRequest[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort) params.set('sort', filters.sort);

  const qs = params.toString();
  const data = await request<{ requests: DevRequest[] }>(
    `/requests${qs ? `?${qs}` : ''}`,
  );
  return data.requests;
}

export async function fetchRequest(id: string): Promise<DevRequest> {
  const data = await request<{ request: DevRequest }>(`/requests/${id}`);
  return data.request;
}

export async function createRequest(
  body: Partial<DevRequest>,
): Promise<DevRequest> {
  const data = await request<{ request: DevRequest }>('/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return data.request;
}

export async function updateRequest(
  id: string,
  body: Partial<DevRequest>,
): Promise<DevRequest> {
  const data = await request<{ request: DevRequest }>(`/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return data.request;
}

export async function deleteRequest(id: string): Promise<void> {
  await request(`/requests/${id}`, { method: 'DELETE' });
}

// ---------- Checklist ----------

export async function addChecklist(
  id: string,
  text: string,
): Promise<ChecklistItem> {
  const data = await request<{ item: ChecklistItem }>(
    `/requests/${id}/checklist`,
    {
      method: 'POST',
      body: JSON.stringify({ text }),
    },
  );
  return data.item;
}

export async function toggleChecklist(
  id: string,
  checklistId: string,
  checked: boolean,
): Promise<ChecklistItem> {
  const data = await request<{ item: ChecklistItem }>(
    `/requests/${id}/checklist/${checklistId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ checked }),
    },
  );
  return data.item;
}

// ---------- Comments ----------

export async function addComment(
  id: string,
  text: string,
  author: string,
): Promise<Comment> {
  const data = await request<{ comment: Comment }>(
    `/requests/${id}/comments`,
    {
      method: 'POST',
      body: JSON.stringify({ text, author }),
    },
  );
  return data.comment;
}

// ---------- Links ----------

export async function addLink(
  id: string,
  label: string,
  url: string,
): Promise<Link> {
  const data = await request<{ link: Link }>(`/requests/${id}/links`, {
    method: 'POST',
    body: JSON.stringify({ label, url }),
  });
  return data.link;
}

// ---------- Attachments ----------

export async function uploadAttachment(
  id: string,
  file: File,
): Promise<{ id: string; filename: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/requests/${id}/attachments`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------- Feedback & Completion ----------

export async function updateFeedback(
  id: string,
  data: { testing_notes?: string; feedback?: string },
): Promise<DevRequest> {
  const result = await request<{ request: DevRequest }>(
    `/requests/${id}/feedback`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
  return result.request;
}

export async function updateCompletion(
  id: string,
  completion_percentage: number,
): Promise<DevRequest> {
  const result = await request<{ request: DevRequest }>(
    `/requests/${id}/completion`,
    {
      method: 'PATCH',
      body: JSON.stringify({ completion_percentage }),
    },
  );
  return result.request;
}

// ---------- Changelog ----------

export async function fetchChangelog(
  since?: string,
  limit?: number,
): Promise<ChangelogEntry[]> {
  const params = new URLSearchParams();
  if (since) params.set('since', since);
  if (limit) params.set('limit', String(limit));

  const qs = params.toString();
  const data = await request<{ changelog: ChangelogEntry[] }>(
    `/requests/changelog${qs ? `?${qs}` : ''}`,
  );
  return data.changelog;
}

// ---------- Stats ----------

export async function fetchStats(): Promise<Stats> {
  const requests = await fetchRequests();
  return {
    total: requests.length,
    completed: requests.filter((r) => r.status === 'completed').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    in_testing: requests.filter((r) => r.status === 'in_testing').length,
    pending: requests.filter((r) => r.status === 'submitted').length,
  };
}
