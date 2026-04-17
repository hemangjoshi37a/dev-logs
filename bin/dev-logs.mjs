#!/usr/bin/env node

/**
 * dev-logs CLI — Start the dev-logs server with a single command.
 *
 * Usage:
 *   npx dev-logs              # Start on default port 4445
 *   npx dev-logs --port 5000  # Start on custom port
 *   npx dev-logs --help       # Show help
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  dev-logs — AI-centric dev submission & tracking platform

  Usage:
    npx dev-logs [options]

  Options:
    --port, -p <port>   Server port (default: 4445)
    --data, -d <dir>    Data directory (default: .dev-logs in current dir)
    --help, -h          Show this help

  Integration:
    Add to any web app:  <script src="http://localhost:4445/overlay.js"></script>
    Or press Ctrl+D in the dev-logs UI to capture.

  Dashboard:
    Open http://localhost:<port> in your browser.
`);
  process.exit(0);
}

function getArg(flag1, flag2, fallback) {
  const idx = Math.max(args.indexOf(flag1), args.indexOf(flag2));
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const PORT = parseInt(getArg('--port', '-p', '4445'), 10);
const DATA_DIR = path.resolve(getArg('--data', '-d', path.join(process.cwd(), '.dev-logs')));

// Ensure data directories exist
const attachmentsDir = path.join(DATA_DIR, 'attachments');
for (const dir of [DATA_DIR, attachmentsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Set env vars for the routes module
process.env.DEV_LOGS_DATA_DIR = DATA_DIR;

// Dynamically import routes (they use the data dir from env)
const { default: createRequestRoutes } = await import(path.join(pkgRoot, 'dist', 'server', 'routes', 'requests.js'));

const app = express();
app.use(cors());
app.use(express.json());

// Serve attachments
app.use('/uploads', express.static(attachmentsDir));

// Serve overlay.js
const overlayPath = path.join(pkgRoot, 'dist', 'overlay.js');
app.get('/overlay.js', (_req, res) => {
  if (fs.existsSync(overlayPath)) {
    res.sendFile(overlayPath);
  } else {
    res.type('application/javascript').send('// overlay.js not built\n');
  }
});

// Mount API routes
app.use('/api/requests', createRequestRoutes);

// Serve built frontend (SPA)
const staticDir = path.join(pkgRoot, 'dist', 'client');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const line = '─'.repeat(50);
  console.log(`
  ${line}

    🐛  dev-logs is running!

    Dashboard:    http://localhost:${PORT}
    Overlay:      http://localhost:${PORT}/overlay.js
    API:          http://localhost:${PORT}/api/requests
    Data:         ${DATA_DIR}

    Integration — add to your app's HTML:
    <script src="http://localhost:${PORT}/overlay.js"></script>

  ${line}
`);
});
