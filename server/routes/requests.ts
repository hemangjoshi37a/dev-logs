// @ts-nocheck — Express 5 types use string|string[] for params; tsx runtime handles this fine
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
// SSE + webhook helpers (imported lazily to avoid circular at startup)
import { broadcastEvent, fireWebhook } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ---------------------------------------------------------------------------
// Data file paths — configurable via DEV_LOGS_DATA_DIR env var
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DEV_LOGS_DATA_DIR || path.join(__dirname, '..', 'data');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const CHANGELOG_FILE = path.join(DATA_DIR, 'changelog.json');
const ATTACHMENTS_DIR = path.join(DATA_DIR, 'attachments');

const MAX_CHANGELOG_ENTRIES = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDirs(): void {
  for (const dir of [DATA_DIR, ATTACHMENTS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

import { db } from '../db.js';

function loadRequests(): Record<string, unknown>[] {
  ensureDirs();
  const rows = db.prepare('SELECT data FROM requests ORDER BY created_at DESC').all() as { data: string }[];
  return rows.map(r => JSON.parse(r.data));
}

function findRequest(requests: Record<string, unknown>[], id: string) {
  const row = db.prepare('SELECT data FROM requests WHERE id = ?').get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data);
}

// saveRequests now accepts the FULL array and upserts them. 
// We optimize it slightly by just replacing it, or we can just use it for legacy compatibility
function saveRequests(requests: Record<string, unknown>[]): void {
  ensureDirs();
  const insert = db.prepare('INSERT OR REPLACE INTO requests (id, status, priority, category, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertMany = db.transaction((reqs: any[]) => {
    for (const req of reqs) {
      insert.run(req.id, req.status, req.priority, req.category, req.created_at, req.updated_at, JSON.stringify(req));
    }
  });
  insertMany(requests);
}

// We also need a fast way to update a single request
function updateSingleRequest(req: Record<string, unknown>): void {
  const stmt = db.prepare('UPDATE requests SET status = ?, priority = ?, category = ?, updated_at = ?, data = ? WHERE id = ?');
  stmt.run(req.status, req.priority, req.category, req.updated_at, JSON.stringify(req), req.id);
}

function deleteSingleRequest(id: string): void {
  db.prepare('DELETE FROM requests WHERE id = ?').run(id);
}

function loadChangelog(): Record<string, unknown>[] {
  ensureDirs();
  const rows = db.prepare('SELECT data FROM changelog ORDER BY timestamp ASC LIMIT ?').all(MAX_CHANGELOG_ENTRIES) as { data: string }[];
  return rows.map(r => JSON.parse(r.data));
}

function saveChangelog(entries: Record<string, unknown>[]): void {
  // Not heavily used to rewrite entire changelog, usually we just append
}

function recordChange(
  requestId: string,
  changeType: string,
  summary: string,
  details: Record<string, unknown> = {},
  author: string = 'system',
): void {
  const entry = {
    id: `chg-${uuidv4().slice(0, 8)}`,
    request_id: requestId,
    change_type: changeType,
    summary,
    details,
    author,
    timestamp: new Date().toISOString(),
  };
  const stmt = db.prepare('INSERT INTO changelog (id, request_id, timestamp, data) VALUES (?, ?, ?, ?)');
  stmt.run(entry.id, entry.request_id, entry.timestamp, JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Multer setup for file uploads
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const requestId = req.params.id;
    const dir = path.join(ATTACHMENTS_DIR, requestId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safeName = `${uuidv4().slice(0, 8)}_${file.originalname}`;
    cb(null, safeName);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB cap

// ---------------------------------------------------------------------------
// Environment Extractor Helper
// ---------------------------------------------------------------------------
function getEnvironmentContext() {
  const env: Record<string, unknown> = {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    node: process.version,
    memory_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
  };

  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      env.dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    }
  } catch (e) {}

  try {
    env.git_branch = execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim();
    env.git_status = execSync('git status -s', { stdio: 'pipe' }).toString().trim().split('\\n').filter(Boolean);
  } catch (e) {}

  return env;
}

// ---------------------------------------------------------------------------
// GET / — List requests with optional filters + stats
// ---------------------------------------------------------------------------
router.get('/', (_req: Request, res: Response) => {
  const { status, priority, category } = _req.query;
  let requests = loadRequests();

  if (status) {
    requests = requests.filter((r) => r.status === status);
  }
  if (priority) {
    requests = requests.filter((r) => r.priority === priority);
  }
  if (category) {
    requests = requests.filter((r) => r.category === category);
  }

  const allRequests = loadRequests();
  const stats = {
    total: allRequests.length,
    completed: allRequests.filter((r) => r.status === 'completed').length,
    in_progress: allRequests.filter((r) => r.status === 'in_progress').length,
    in_testing: allRequests.filter((r) => r.status === 'in_testing').length,
    pending: allRequests.filter((r) => r.status === 'submitted').length,
  };

  res.json({ status: 'success', requests, stats });
});

// ---------------------------------------------------------------------------
// GET /changelog — Get changelog
// ---------------------------------------------------------------------------
router.get('/changelog', (req: Request, res: Response) => {
  const { since, limit: limitStr } = req.query;
  const limit = limitStr ? parseInt(limitStr as string, 10) : 50;
  let entries = loadChangelog();

  if (since && typeof since === 'string') {
    try {
      const sinceDate = new Date(since);
      entries = entries.filter((e) => new Date(e.timestamp as string) > sinceDate);
    } catch {
      // ignore invalid since param
    }
  }

  // Return most recent first, limited
  entries = entries.slice(-limit).reverse();

  res.json({ status: 'success', changes: entries, count: entries.length });
});

// ---------------------------------------------------------------------------
// GET /:id — Get single request
// ---------------------------------------------------------------------------
router.get('/:id', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }
  res.json({ status: 'success', request });
});

// ---------------------------------------------------------------------------
// POST / — Create request
// ---------------------------------------------------------------------------
router.post('/', (req: Request, res: Response) => {
  const requests = loadRequests();
  const body = req.body;

  // Validate required fields
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    res.status(400).json({ status: 'error', detail: 'title is required' });
    return;
  }
  if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
    res.status(400).json({ status: 'error', detail: 'description is required' });
    return;
  }

  // Generate next REQ-XXX ID
  const existingNums: number[] = [];
  for (const r of requests) {
    const match = (r.id as string).match(/^REQ-(\d+)$/);
    if (match) {
      existingNums.push(parseInt(match[1], 10));
    }
  }
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;

  const now = new Date().toISOString();
  const checklist = (body.checklist || []).map(
    (item: { id?: string; text: string; checked?: boolean }, i: number) => ({
      id: item.id || `c${i + 1}`,
      text: item.text,
      checked: item.checked || false,
    }),
  );
  const links = (body.links || []).map((link: { label: string; url: string }) => ({
    label: link.label,
    url: link.url,
  }));

  const newRequest: Record<string, unknown> = {
    id: `REQ-${String(nextNum).padStart(3, '0')}`,
    title: body.title,
    description: body.description,
    status: 'submitted',
    priority: body.priority || 'medium',
    category: body.category || 'feature',
    created_at: now,
    updated_at: now,
    checklist,
    attachments: [],
    links,
    comments: [],
    submitted_by: body.submitted_by || 'client',
    platform: body.platform || 'dev-logs',
    completion_percentage: null,
    testing_notes: null,
    feedback: null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [],
    due_date: body.due_date || null,
    github_pr: body.github_pr || null,
    git_branch: body.git_branch || null,
    estimated_hours: body.estimated_hours || 0,
    actual_hours: body.actual_hours || 0,
    environment_context: getEnvironmentContext(),
  };

  requests.push(newRequest);
  saveRequests(requests);

  recordChange(
    newRequest.id as string,
    'request_created',
    `New request created: ${body.title}`,
    { priority: body.priority, category: body.category, platform: body.platform },
    body.submitted_by || 'client',
  );

  broadcastEvent('request_created', { id: newRequest.id, title: newRequest.title, priority: newRequest.priority, category: newRequest.category });
  fireWebhook('request_created', { id: newRequest.id, title: newRequest.title, priority: newRequest.priority, status: 'submitted' });

  res.status(201).json({ status: 'success', request: newRequest });
});

// ---------------------------------------------------------------------------
// PUT /:id — Update request
// ---------------------------------------------------------------------------
router.put('/:id', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const body = req.body;
  const oldStatus = request.status as string;
  const oldPriority = request.priority as string;

  const updatableFields = [
    'title', 'description', 'status', 'priority', 'category',
    'platform', 'submitted_by', 'testing_notes', 'feedback', 'due_date',
    'github_pr', 'git_branch', 'estimated_hours', 'actual_hours'
  ];
  for (const field of updatableFields) {
    if (body[field] !== undefined && body[field] !== null) {
      request[field] = body[field];
    }
  }
  if (Array.isArray(body.tags)) {
    request.tags = body.tags.filter((t: unknown) => typeof t === 'string');
  }
  if (body.completion_percentage !== undefined && body.completion_percentage !== null) {
    request.completion_percentage = Math.max(0, Math.min(100, body.completion_percentage));
  }
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  // Record + broadcast changes
  if (body.status !== undefined && body.status !== oldStatus) {
    recordChange(
      req.params.id,
      'status_change',
      `${req.params.id} status changed: ${oldStatus} → ${body.status}`,
      { old_status: oldStatus, new_status: body.status, title: request.title as string },
    );
    broadcastEvent('status_change', { id: req.params.id, title: request.title, old_status: oldStatus, new_status: body.status });
    fireWebhook('status_change', { request_id: req.params.id, title: request.title, old_status: oldStatus, new_status: body.status });
  }
  if (body.priority !== undefined && body.priority !== oldPriority) {
    recordChange(
      req.params.id,
      'priority_change',
      `${req.params.id} priority changed: ${oldPriority} → ${body.priority}`,
      { old_priority: oldPriority, new_priority: body.priority, title: request.title as string },
    );
  }
  if (body.title !== undefined || body.description !== undefined) {
    recordChange(
      req.params.id,
      'request_updated',
      `${req.params.id} details updated`,
      { title: request.title as string },
    );
  }

  res.json({ status: 'success', request });
});

// ---------------------------------------------------------------------------
// DELETE /:id — Delete request
// ---------------------------------------------------------------------------
router.delete('/:id', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }
  deleteSingleRequest(req.params.id);
  res.json({ status: 'success', message: `Request ${req.params.id} deleted` });
});

// ---------------------------------------------------------------------------
// POST /:id/checklist — Add checklist item
// ---------------------------------------------------------------------------
router.post('/:id/checklist', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const checklist = (request.checklist as Array<Record<string, unknown>>) || [];
  const newId = `c-${uuidv4().slice(0, 8)}`;
  checklist.push({ id: newId, text: req.body.text, checked: false });
  request.checklist = checklist;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'checklist_updated',
    `${req.params.id}: checklist item added — "${req.body.text}"`,
    { item_text: req.body.text, title: request.title as string },
  );

  res.json({ status: 'success', checklist });
});

// ---------------------------------------------------------------------------
// PUT /:id/checklist/:checklistId — Toggle checklist item
// ---------------------------------------------------------------------------
router.put('/:id/checklist/:checklistId', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const checklist = (request.checklist as Array<Record<string, unknown>>) || [];
  const item = checklist.find((c) => c.id === req.params.checklistId);
  if (!item) {
    res.status(404).json({ status: 'error', detail: `Checklist item ${req.params.checklistId} not found` });
    return;
  }

  item.checked = req.body.checked;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  const action = req.body.checked ? 'completed' : 'unchecked';
  recordChange(
    req.params.id,
    'checklist_updated',
    `${req.params.id}: task ${action} — "${item.text}"`,
    { item_text: item.text as string, checked: req.body.checked, title: request.title as string },
  );

  res.json({ status: 'success', checklist });
});

// ---------------------------------------------------------------------------
// POST /:id/comments — Add comment
// ---------------------------------------------------------------------------
router.post('/:id/comments', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const comments = (request.comments as Array<Record<string, unknown>>) || [];
  const author = req.body.author || 'dev-team';
  const newComment = {
    id: `cmt-${uuidv4().slice(0, 8)}`,
    text: req.body.text,
    author,
    created_at: new Date().toISOString(),
  };
  comments.push(newComment);
  request.comments = comments;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'comment_added',
    `${req.params.id}: new comment by ${author}`,
    { comment_text: (req.body.text as string).slice(0, 200), author, title: request.title as string },
    author,
  );

  res.json({ status: 'success', comments });
});

// ---------------------------------------------------------------------------
// POST /:id/links — Add reference link
// ---------------------------------------------------------------------------
router.post('/:id/links', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const links = (request.links as Array<Record<string, unknown>>) || [];
  links.push({ label: req.body.label, url: req.body.url });
  request.links = links;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'link_added',
    `${req.params.id}: link added — "${req.body.label}"`,
    { label: req.body.label, url: req.body.url, title: request.title as string },
  );

  res.json({ status: 'success', links });
});

// ---------------------------------------------------------------------------
// POST /:id/attachments — Upload file
// ---------------------------------------------------------------------------
router.post('/:id/attachments', upload.single('file'), (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ status: 'error', detail: 'No file uploaded' });
    return;
  }

  const attachment = {
    id: `att-${uuidv4().slice(0, 8)}`,
    filename: file.originalname,
    stored_as: file.filename,
    content_type: file.mimetype || 'application/octet-stream',
    size: file.size,
    url: `/api/requests/${req.params.id}/attachments/${file.filename}`,
    uploaded_at: new Date().toISOString(),
  };

  const attachments = (request.attachments as Array<Record<string, unknown>>) || [];
  attachments.push(attachment);
  request.attachments = attachments;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'attachment_added',
    `${req.params.id}: file attached — "${file.originalname}"`,
    { filename: file.originalname, size: file.size, title: request.title as string },
  );

  res.json({ status: 'success', attachment });
});

// ---------------------------------------------------------------------------
// GET /:id/attachments/:filename — Serve attachment file
// ---------------------------------------------------------------------------
router.get('/:id/attachments/:filename', (req: Request, res: Response) => {
  const filePath = path.join(ATTACHMENTS_DIR, req.params.id, req.params.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ status: 'error', detail: 'Attachment not found' });
    return;
  }
  res.sendFile(filePath);
});

// ---------------------------------------------------------------------------
// PUT /:id/feedback — Update testing notes / feedback
// ---------------------------------------------------------------------------
router.put('/:id/feedback', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const changes: string[] = [];
  if (req.body.testing_notes !== undefined) {
    request.testing_notes = req.body.testing_notes;
    changes.push('testing_notes');
  }
  if (req.body.feedback !== undefined) {
    request.feedback = req.body.feedback;
    changes.push('feedback');
  }
  if (changes.length === 0) {
    res.json({ status: 'success', request, message: 'No fields provided' });
    return;
  }

  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'feedback_updated',
    `${req.params.id}: ${changes.join(', ')} updated`,
    { fields: changes, title: request.title as string },
  );

  res.json({ status: 'success', request });
});

// ---------------------------------------------------------------------------
// PATCH /:id/completion — Update completion percentage
// ---------------------------------------------------------------------------
router.patch('/:id/completion', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const pct = req.body.completion_percentage;
  if (pct === undefined || pct === null || typeof pct !== 'number' || pct < 0 || pct > 100) {
    res.status(400).json({ status: 'error', detail: 'completion_percentage must be a number between 0 and 100' });
    return;
  }

  const oldPct = request.completion_percentage;
  request.completion_percentage = pct;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'completion_updated',
    `${req.params.id}: completion ${oldPct}% → ${pct}%`,
    { old: oldPct, new: pct, title: request.title as string },
  );

  res.json({ status: 'success', request });
});

// ---------------------------------------------------------------------------
// POST /:id/suggest-fix — AI Fix Recommender
// ---------------------------------------------------------------------------
router.post('/:id/suggest-fix', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const desc = request.description as string || '';
  const errorsMatch = desc.match(/\*\*Console Errors\*\*:\s*(\d+)/);
  const hasErrors = errorsMatch && parseInt(errorsMatch[1]) > 0;
  
  // Mock AI response
  setTimeout(() => {
    let suggestion = '';
    if (hasErrors) {
      suggestion = `Based on the console errors reported in this ticket, it looks like a runtime exception occurred.\n\n**Suggested Fix:**\n1. Wrap the failing component in an Error Boundary or add a null check.\n2. Verify API responses before accessing properties.\n\n\`\`\`javascript\n// Example fix\nif (!data?.items) {\n  return <FallbackLoader />;\n}\n\`\`\``;
    } else if (request.category === 'ui-ux' || request.category === 'ui') {
      suggestion = `This appears to be a styling or layout issue.\n\n**Suggested Fix:**\nCheck the Tailwind/CSS classes on the container. Ensure flex or grid layouts are configured correctly.\n\n\`\`\`html\n<!-- Example fix -->\n<div className="flex items-center justify-center w-full h-full">\n  <Content />\n</div>\n\`\`\``;
    } else {
      suggestion = `Based on the description: "${request.title}", here is a general recommendation:\n\n1. Verify the initial state values.\n2. Check the network tab for any failed asynchronous requests.\n3. Add console logs to trace the execution path.\n\n\`\`\`typescript\nconsole.log('[Debug] Current state:', state);\n\`\`\``;
    }

    res.json({ status: 'success', suggestion });
  }, 2000);
});

// ---------------------------------------------------------------------------
// PATCH /:id/tags — Update tags array
// ---------------------------------------------------------------------------
router.patch('/:id/tags', (req: Request, res: Response) => {
  const requests = loadRequests();
  const request = findRequest(requests, req.params.id);
  if (!request) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }

  const { tags } = req.body;
  if (!Array.isArray(tags)) {
    res.status(400).json({ status: 'error', detail: 'tags must be an array of strings' });
    return;
  }

  const cleaned = tags
    .filter((t: unknown) => typeof t === 'string' && t.trim().length > 0)
    .map((t: string) => t.trim().toLowerCase());

  request.tags = cleaned;
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  recordChange(
    req.params.id,
    'tags_updated',
    `${req.params.id}: tags updated — [${cleaned.join(', ')}]`,
    { tags: cleaned, title: request.title as string },
  );

  res.json({ status: 'success', tags: cleaned });
});

// ---------------------------------------------------------------------------
// GET /export — Export all requests in JSON, CSV, or Markdown
// ---------------------------------------------------------------------------
router.get('/export', (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'json';
  const requests = loadRequests();

  if (format === 'csv') {
    const header = 'id,title,status,priority,category,submitted_by,created_at,completion_percentage,tags';
    const rows = requests.map((r) => {
      const tags = Array.isArray(r.tags) ? (r.tags as string[]).join(';') : '';
      return [
        r.id, `"${String(r.title || '').replace(/"/g, '""')}"`,
        r.status, r.priority, r.category, r.submitted_by,
        r.created_at, r.completion_percentage ?? '', `"${tags}"`,
      ].join(',');
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dev-logs-export.csv"');
    res.send([header, ...rows].join('\n'));
    return;
  }

  if (format === 'markdown') {
    const lines: string[] = ['# Dev Logs Export', `> Generated: ${new Date().toISOString()}`, ''];
    for (const r of requests) {
      const tags = Array.isArray(r.tags) && (r.tags as string[]).length > 0
        ? ` · Tags: ${(r.tags as string[]).join(', ')}`
        : '';
      lines.push(`## ${r.id}: ${r.title}`);
      lines.push(`**Status:** ${r.status} | **Priority:** ${r.priority} | **Category:** ${r.category}${tags}`);
      lines.push(`**Created:** ${r.created_at}`);
      if (r.description) lines.push(`\n${r.description}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="dev-logs-export.md"');
    res.send(lines.join('\n'));
    return;
  }

  // Default: JSON
  res.setHeader('Content-Disposition', 'attachment; filename="dev-logs-export.json"');
  res.json({ exported_at: new Date().toISOString(), count: requests.length, requests });
});

export default router;
