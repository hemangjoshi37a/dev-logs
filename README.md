# dev-logs

AI-centric dev submission and tracking platform. Capture bugs, features, and improvements with rich context — screenshots, console logs, element metadata, and annotations — so AI can immediately start working on submitted requests.

## Features

- **Floating Bug Button** — Inject into any web app with a single `<script>` tag
- **Rich Context Capture** — Screenshots, console error/warning logs, viewport info, URL, user agent
- **Element Picker** — Click on DOM elements to capture their metadata (tag, classes, selector, dimensions)
- **Area Snip & Annotations** — Crop specific regions, draw freehand annotations on screenshots
- **Full Ticket Tracking** — Status lifecycle (submitted → in-progress → testing → completed)
- **Checklists** — Break down work items with completion tracking
- **Comments** — Markdown-supported discussion threads
- **File Attachments** — Upload images, logs, or any supporting files
- **Dashboard** — Stats overview, recent activity, priority breakdown
- **AI-Ready** — Structured JSON output with full context for AI consumption

## Quick Start

```bash
# Clone and install
git clone https://github.com/user/dev-logs.git
cd dev-logs
npm install

# Start dev server (frontend + backend)
npm run dev

# Open dashboard
open http://localhost:3333
```

## Integration

Add the overlay to any web application during development:

```html
<!-- Add this to your app's index.html -->
<script src="http://localhost:3334/overlay.js"></script>
```

The floating bug button appears at the bottom-right. Press **Ctrl+D** to open the capture overlay.

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐
│   YOUR WEB APP          │     │   DEV-LOGS SERVER        │
│                         │     │                          │
│   ┌──────────────────┐  │     │   Frontend (React/Vite)  │
│   │  <script>        │──┼────►│   http://localhost:3333  │
│   │  overlay.js      │  │     │                          │
│   └──────────────────┘  │     │   Backend (Express)      │
│                         │     │   http://localhost:3334   │
│   🐛 Bug Button         │     │                          │
│   (captures context)    │────►│   /api/requests          │
│                         │     │   JSON file storage      │
└─────────────────────────┘     └──────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| UI Components | ShadCN/Radix UI |
| Backend | Node.js + Express + TypeScript |
| Storage | JSON files (zero config, no database) |
| Overlay | Self-contained IIFE bundle |

## Scripts

```bash
npm run dev          # Start frontend + backend concurrently
npm run dev:client   # Start frontend only (Vite, port 3333)
npm run dev:server   # Start backend only (Express, port 3334)
npm run build        # Build frontend for production
npm run build:overlay # Build overlay.js bundle
```

## API Endpoints

All endpoints prefixed with `/api/requests`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List requests (filter: status, priority, category) |
| POST | `/` | Create request |
| GET | `/:id` | Get request detail |
| PUT | `/:id` | Update request |
| DELETE | `/:id` | Delete request |
| POST | `/:id/checklist` | Add checklist item |
| PUT | `/:id/checklist/:cid` | Toggle checklist |
| POST | `/:id/comments` | Add comment |
| POST | `/:id/links` | Add reference link |
| POST | `/:id/attachments` | Upload file |
| GET | `/:id/attachments/:file` | Get attachment |
| PUT | `/:id/feedback` | Update testing notes |
| PATCH | `/:id/completion` | Update completion % |
| GET | `/changelog` | Activity changelog |

## License

MIT
