import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

const SETTINGS_FILE = path.join(process.cwd(), 'server', 'data', 'settings.json');
const MOCKS_FILE = path.join(process.cwd(), 'server', 'data', 'mocks.json');

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return { webhook_url: '' };
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); } catch { return { webhook_url: '' }; }
}

function saveSettings(settings: any) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function loadMocks() {
  if (!fs.existsSync(MOCKS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(MOCKS_FILE, 'utf-8')); } catch { return []; }
}

function saveMocks(mocks: any[]) {
  const dir = path.dirname(MOCKS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MOCKS_FILE, JSON.stringify(mocks, null, 2));
}

// Endpoint to get settings
router.get('/settings', (req: Request, res: Response) => {
  res.json({ status: 'success', settings: loadSettings() });
});

// Endpoint to update settings
router.post('/settings', (req: Request, res: Response) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json({ status: 'success', settings: updated });
});

// Endpoint to get mock rules
router.get('/mocks', (req: Request, res: Response) => {
  res.json({ status: 'success', mocks: loadMocks() });
});

// Endpoint to save all mock rules
router.post('/mocks', (req: Request, res: Response) => {
  const mocks = req.body;
  if (!Array.isArray(mocks)) {
    res.status(400).json({ status: 'error', detail: 'Body must be an array of mock rules' });
    return;
  }
  saveMocks(mocks);
  res.json({ status: 'success', mocks });
});

// Endpoint to list files in a directory
router.get('/ls', (req: Request, res: Response) => {
  try {
    const dir = req.query.dir as string || process.cwd();
    if (!fs.existsSync(dir)) {
      res.status(404).json({ status: 'error', detail: 'Directory not found' });
      return;
    }
    
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const files = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dir, item.name)
    }));
    
    // Sort directories first
    files.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });

    res.json({ status: 'success', currentDir: dir, files });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to read file contents
router.get('/cat', (req: Request, res: Response) => {
  try {
    const file = req.query.file as string;
    if (!file) {
      res.status(400).json({ status: 'error', detail: 'File parameter is required' });
      return;
    }
    if (!fs.existsSync(file)) {
      res.status(404).json({ status: 'error', detail: 'File not found' });
      return;
    }
    
    const stats = fs.statSync(file);
    if (stats.size > 10 * 1024 * 1024) { // Limit to 10MB
      res.status(400).json({ status: 'error', detail: 'File too large' });
      return;
    }

    const content = fs.readFileSync(file, 'utf-8');
    res.json({ status: 'success', file, content });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to execute a command
router.post('/exec', async (req: Request, res: Response) => {
  try {
    const { command, cwd = process.cwd() } = req.body;
    
    if (!command) {
      res.status(400).json({ status: 'error', detail: 'Command is required' });
      return;
    }

    // Basic security check (though it's a local dev tool)
    if (command.includes('rm -rf /') || command.includes('del /f /s /q c:\\')) {
      res.status(400).json({ status: 'error', detail: 'Potentially dangerous command rejected' });
      return;
    }

    const { stdout, stderr } = await execAsync(command, { cwd });
    
    res.json({ 
      status: 'success', 
      command,
      cwd,
      stdout,
      stderr 
    });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ 
      status: 'error', 
      detail: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || ''
    });
  }
});

import os from 'os';
import { db } from '../db.js';

// Endpoint to get system metrics
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const processMem = process.memoryUsage();
    const cpus = os.cpus();
    
    res.json({
      status: 'success',
      data: {
        uptime: os.uptime(),
        processUptime: process.uptime(),
        os: {
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          nodeVersion: process.version
        },
        cpu: {
          model: cpus[0]?.model || 'Unknown CPU',
          cores: cpus.length,
          loadAvg: os.loadavg(),
        },
        memory: {
          total: memTotal,
          free: memFree,
          used: memTotal - memFree,
          percent: ((memTotal - memFree) / memTotal) * 100
        },
        processMemory: {
          rss: processMem.rss,
          heapTotal: processMem.heapTotal,
          heapUsed: processMem.heapUsed,
          external: processMem.external,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to execute SQL queries
router.post('/sql', (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ status: 'error', detail: 'Query is required' });
      return;
    }

    const trimmed = query.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.startsWith('EXPLAIN');
    
    if (isSelect) {
      const results = db.prepare(query).all();
      res.json({ status: 'success', data: results });
    } else {
      const info = db.prepare(query).run();
      res.json({ status: 'success', info });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to get analytics data
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const totalReqs = db.prepare('SELECT count(*) as count FROM requests').get() as { count: number };
    const statusCounts = db.prepare('SELECT status, count(*) as count FROM requests GROUP BY status').all();
    const priorityCounts = db.prepare('SELECT priority, count(*) as count FROM requests GROUP BY priority').all();
    const categoryCounts = db.prepare('SELECT category, count(*) as count FROM requests GROUP BY category').all();
    const recentReqs = db.prepare(`
      SELECT substr(created_at, 1, 10) as date, count(*) as count 
      FROM requests 
      GROUP BY date 
      ORDER BY date DESC 
      LIMIT 14
    `).all().reverse();

    res.json({
      status: 'success',
      data: {
        total: totalReqs.count,
        byStatus: statusCounts,
        byPriority: priorityCounts,
        byCategory: categoryCounts,
        timeline: recentReqs
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

import { v4 as uuidv4 } from 'uuid';

// Endpoint to get all whiteboards
router.get('/whiteboards', (req: Request, res: Response) => {
  try {
    const results = db.prepare('SELECT * FROM whiteboards ORDER BY updated_at DESC').all();
    const parsed = results.map((r: any) => ({ ...r, data: JSON.parse(r.data) }));
    res.json({ status: 'success', data: parsed });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to save a whiteboard
router.post('/whiteboards', (req: Request, res: Response) => {
  try {
    const { id, name, data } = req.body;
    const now = new Date().toISOString();
    
    if (id) {
      // Update existing
      const existing = db.prepare('SELECT id FROM whiteboards WHERE id = ?').get(id);
      if (existing) {
        db.prepare('UPDATE whiteboards SET name = ?, data = ?, updated_at = ? WHERE id = ?')
          .run(name || 'Untitled Canvas', JSON.stringify(data), now, id);
        res.json({ status: 'success', data: { id } });
        return;
      }
    }
    
    // Create new
    const newId = id || uuidv4();
    db.prepare('INSERT INTO whiteboards (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(newId, name || 'Untitled Canvas', JSON.stringify(data || { nodes: [], edges: [] }), now, now);
      
    res.json({ status: 'success', data: { id: newId } });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

// Endpoint to delete a whiteboard
router.delete('/whiteboards/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM whiteboards WHERE id = ?').run(req.params.id);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ status: 'error', detail: (error as Error).message });
  }
});

export default router;
