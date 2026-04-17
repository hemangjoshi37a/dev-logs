import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import requestRoutes from './routes/requests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '4445', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded attachments
const attachmentsDir = path.join(__dirname, 'data', 'attachments');
app.use('/uploads', express.static(attachmentsDir));

// Serve overlay.js
app.get('/overlay.js', (_req, res) => {
  const distOverlay = path.join(__dirname, '..', 'dist', 'overlay.js');
  if (fs.existsSync(distOverlay)) {
    res.sendFile(distOverlay);
  } else {
    res.type('application/javascript').send('// overlay.js placeholder — build with: npm run build:overlay\n');
  }
});

// Mount API routes
app.use('/api/requests', requestRoutes);

// Create data directories on startup
const dataDir = path.join(__dirname, 'data');
const dirs = [dataDir, attachmentsDir];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`dev-logs server running on http://localhost:${PORT}`);
});
