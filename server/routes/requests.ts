// @ts-nocheck — Express 5 types use string|string[] for params; tsx runtime handles this fine
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

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

function loadRequests(): Record<string, unknown>[] {
  ensureDirs();
  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, '[]');
    return [];
  }
  try {
    const raw = fs.readFileSync(REQUESTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRequests(requests: Record<string, unknown>[]): void {
  ensureDirs();
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
}

function loadChangelog(): Record<string, unknown>[] {
  ensureDirs();
  if (!fs.existsSync(CHANGELOG_FILE)) {
    fs.writeFileSync(CHANGELOG_FILE, '[]');
    return [];
  }
  try {
    const raw = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChangelog(entries: Record<string, unknown>[]): void {
  ensureDirs();
  const trimmed = entries.slice(-MAX_CHANGELOG_ENTRIES);
  fs.writeFileSync(CHANGELOG_FILE, JSON.stringify(trimmed, null, 2));
}

function recordChange(
  requestId: string,
  changeType: string,
  summary: string,
  details: Record<string, unknown> = {},
  author: string = 'system',
): void {
  const entries = loadChangelog();
  entries.push({
    id: `chg-${uuidv4().slice(0, 8)}`,
    request_id: requestId,
    change_type: changeType,
    summary,
    details,
    author,
    timestamp: new Date().toISOString(),
  });
  saveChangelog(entries);
}

function findRequest(requests: Record<string, unknown>[], id: string) {
  return requests.find((r) => r.id === id) || null;
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
const upload = multer({ storage });

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
    in_progress: allRequests.filter((r) => r.status === 'in-progress').length,
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
    platform: body.platform || 'AgentiX Cyber',
    completion_percentage: null,
    testing_notes: null,
    feedback: null,
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
    'platform', 'submitted_by', 'testing_notes', 'feedback',
  ];
  for (const field of updatableFields) {
    if (body[field] !== undefined && body[field] !== null) {
      request[field] = body[field];
    }
  }
  if (body.completion_percentage !== undefined && body.completion_percentage !== null) {
    request.completion_percentage = Math.max(0, Math.min(100, body.completion_percentage));
  }
  request.updated_at = new Date().toISOString();
  saveRequests(requests);

  // Record changes
  if (body.status !== undefined && body.status !== oldStatus) {
    recordChange(
      req.params.id,
      'status_change',
      `${req.params.id} status changed: ${oldStatus} → ${body.status}`,
      { old_status: oldStatus, new_status: body.status, title: request.title as string },
    );
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
  const filtered = requests.filter((r) => r.id !== req.params.id);
  if (filtered.length === requests.length) {
    res.status(404).json({ status: 'error', detail: `Request ${req.params.id} not found` });
    return;
  }
  saveRequests(filtered);
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
  const newId = `c${checklist.length + 1}`;
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

export default router;
