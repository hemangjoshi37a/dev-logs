/**
 * DevCapture - Context-rich dev request capture overlay.
 *
 * Adapted from AgentiXCyber's DevCapture for the standalone dev-logs platform.
 * Uses plain fetch() and HTML elements (no ShadCN dependencies).
 *
 * Modes:
 *  1. Screenshot -- draw a highlight rectangle over the page screenshot
 *  2. Select Element -- visual element picker (hover to highlight, click to select)
 *  3. Snip Area -- crop a specific region of the live page
 *  4. Annotate -- freehand draw on the screenshot
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Send,
  Bug,
  Sparkles,
  Wrench,
  Palette,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Crosshair,
  Scissors,
  Trash2,
  Pencil,
  Eraser,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const API_URL = '/api/requests';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DevCaptureProps {
  open: boolean;
  onClose: () => void;
  apiUrl?: string;
}

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnnotationStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

type Priority = 'low' | 'medium' | 'high' | 'critical';
type Category = 'bug' | 'enhancement' | 'feature' | 'ui-ux';
type CaptureMode = 'screenshot' | 'picker' | 'snip';

const ANNOTATION_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#facc15', label: 'Yellow' },
  { value: '#22d3ee', label: 'Cyan' },
  { value: '#ffffff', label: 'White' },
];

const ANNOTATION_WIDTHS = [
  { value: 2, label: 'Thin' },
  { value: 5, label: 'Thick' },
];

interface ConsoleEntry {
  level: string;
  message: string;
  timestamp: string;
}

interface SelectedElement {
  tag: string;
  id: string;
  classes: string[];
  text: string;
  selector: string;
  rect: { x: number; y: number; width: number; height: number };
  screenshot?: string;
  componentName?: string;
}

// ---------------------------------------------------------------------------
// Console buffer (global)
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    __consoleBuffer?: ConsoleEntry[];
  }
}

let _interceptorInstalled = false;
export function installConsoleInterceptor() {
  if (_interceptorInstalled) return;
  _interceptorInstalled = true;

  const buf: ConsoleEntry[] = [];
  const MAX = 100;
  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args: unknown[]) => {
    buf.push({
      level: 'error',
      message: args.map(String).join(' ').slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    if (buf.length > MAX) buf.shift();
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    buf.push({
      level: 'warn',
      message: args.map(String).join(' ').slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    if (buf.length > MAX) buf.shift();
    origWarn(...args);
  };

  window.__consoleBuffer = buf;
}

// ---------------------------------------------------------------------------
// Screenshot helpers
// ---------------------------------------------------------------------------
async function captureScreenshot(): Promise<string> {
  try {
    const { toPng } = await import('html-to-image');
    return await toPng(document.body, {
      cacheBust: true,
      width: window.innerWidth,
      height: window.innerHeight,
      style: { transform: 'none' },
    });
  } catch {
    return '';
  }
}

async function captureElement(el: Element): Promise<string> {
  try {
    const { toPng } = await import('html-to-image');
    return await toPng(el as HTMLElement, { quality: 0.8, cacheBust: true });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// CSS Selector generation
// ---------------------------------------------------------------------------
function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  let path = '';
  let current: Element | null = el;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      path = path ? `#${current.id} > ${path}` : `#${current.id}`;
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith('__'))
        .slice(0, 2)
        .join('.');
      if (classes) selector += `.${classes}`;
    }
    path = path ? `${selector} > ${path}` : selector;
    current = current.parentElement;
  }
  return path || el.tagName.toLowerCase();
}

function getComponentName(el: Element): string | undefined {
  let current: Element | null = el;
  while (current) {
    const testId = current.getAttribute('data-testid');
    if (testId) return testId;
    const componentAttr = current.getAttribute('data-component');
    if (componentAttr) return componentAttr;
    current = current.parentElement;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Priorities & Categories
// ---------------------------------------------------------------------------
const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

const CATEGORIES: { value: Category; label: string; icon: React.ElementType }[] = [
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'enhancement', label: 'Enhancement', icon: Sparkles },
  { value: 'feature', label: 'Feature', icon: Wrench },
  { value: 'ui-ux', label: 'UI/UX', icon: Palette },
];

function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    button: '#22d3ee', a: '#818cf8', input: '#f472b6', textarea: '#f472b6',
    select: '#f472b6', img: '#fb923c', div: '#94a3b8', span: '#94a3b8',
    h1: '#a78bfa', h2: '#a78bfa', h3: '#a78bfa', h4: '#a78bfa',
    p: '#64748b', svg: '#34d399', table: '#fbbf24', form: '#fb7185',
    nav: '#2dd4bf', header: '#2dd4bf', footer: '#2dd4bf',
    section: '#64748b', li: '#64748b', ul: '#64748b',
  };
  return colors[tag.toLowerCase()] || '#94a3b8';
}

// ---------------------------------------------------------------------------
// Upload helpers
// ---------------------------------------------------------------------------
async function uploadScreenshot(
  baseUrl: string,
  requestId: string,
  dataUrl: string,
  filename: string,
): Promise<void> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const formData = new FormData();
  formData.append('file', blob, filename);
  await fetch(`${baseUrl}/${requestId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

// ---------------------------------------------------------------------------
// Overlay class names
// ---------------------------------------------------------------------------
const OVERLAY_CLASS = 'dev-capture-overlay';
const PANEL_CLASS = 'dev-capture-panel';
const HIGHLIGHT_CLASS = 'dev-capture-highlight-overlay';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const DevCapture: React.FC<DevCaptureProps> = ({ open, onClose, apiUrl }) => {
  const baseUrl = apiUrl || API_URL;

  const [screenshotData, setScreenshotData] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [screenshotCollapsed, setScreenshotCollapsed] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('bug');

  // Mode
  const [mode, setMode] = useState<CaptureMode>('screenshot');

  // Highlight rectangle
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Element picker
  const [selectedElements, setSelectedElements] = useState<SelectedElement[]>([]);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [hoverTag, setHoverTag] = useState<string>('');
  const pickerActive = mode === 'picker';

  // Snip mode
  const [snipRect, setSnipRect] = useState<HighlightRect | null>(null);
  const [snipDrawing, setSnipDrawing] = useState(false);
  const [snipStart, setSnipStart] = useState<{ x: number; y: number } | null>(null);
  const [snipImage, setSnipImage] = useState<string>('');

  // Annotation
  const [annotateMode, setAnnotateMode] = useState(false);
  const [annotationStrokes, setAnnotationStrokes] = useState<AnnotationStroke[]>([]);
  const [annotationColor, setAnnotationColor] = useState('#ef4444');
  const [annotationWidth, setAnnotationWidth] = useState(2);
  const [annotating, setAnnotating] = useState(false);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);

  // Console info
  const consoleErrors = (window.__consoleBuffer || []).filter((e) => e.level === 'error').length;
  const consoleWarnings = (window.__consoleBuffer || []).filter((e) => e.level === 'warn').length;
  const pageUrl = window.location.pathname;

  // Capture on open
  useEffect(() => {
    if (!open) return;
    setCapturing(true);
    setSubmitted(false);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('bug');
    setHighlightRect(null);
    setMode('screenshot');
    setSelectedElements([]);
    setHoverRect(null);
    setSnipRect(null);
    setSnipImage('');
    setAnnotateMode(false);
    setAnnotationStrokes([]);
    setAnnotating(false);
    setScreenshotCollapsed(false);

    captureScreenshot().then((data) => {
      setScreenshotData(data);
      setCapturing(false);
    });
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (annotateMode) setAnnotateMode(false);
        else if (mode === 'picker' || mode === 'snip') {
          setMode('screenshot');
          setHoverRect(null);
          setSnipDrawing(false);
          setSnipStart(null);
        } else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, mode, annotateMode]);

  // Element picker handlers
  useEffect(() => {
    if (!open || !pickerActive) {
      setHoverRect(null);
      return;
    }

    const onMove = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) { setHoverRect(null); return; }
      if (el.closest(`.${OVERLAY_CLASS}`) || el.closest(`.${PANEL_CLASS}`) || el.closest(`.${HIGHLIGHT_CLASS}`)) {
        setHoverRect(null);
        return;
      }
      setHoverRect(el.getBoundingClientRect());
      setHoverTag(el.tagName.toLowerCase());
    };

    const onClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      if (el.closest(`.${OVERLAY_CLASS}`) || el.closest(`.${PANEL_CLASS}`) || el.closest(`.${HIGHLIGHT_CLASS}`)) return;

      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      const id = el.id || '';
      const classes = el.className && typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean) : [];
      const text = (el.textContent || '').trim().slice(0, 200);
      const selector = getSelector(el);
      const compName = getComponentName(el);
      let screenshot = '';
      try { screenshot = await captureElement(el); } catch { /* ignore */ }

      const newEl: SelectedElement = { tag, id, classes, text, selector, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, screenshot, componentName: compName };
      setSelectedElements((prev) => {
        if (prev.some((p) => p.selector === selector && p.tag === tag)) return prev;
        return [...prev, newEl];
      });
      toast.success(`Selected <${tag}>${id ? ` #${id}` : ''}`);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [open, pickerActive]);

  // Snip capture
  useEffect(() => {
    if (!snipRect || snipDrawing || mode !== 'snip') return;
    if (snipRect.width < 10 || snipRect.height < 10) return;
    if (!screenshotData) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleX = img.naturalWidth / window.innerWidth;
      const scaleY = img.naturalHeight / window.innerHeight;
      canvas.width = snipRect.width * scaleX;
      canvas.height = snipRect.height * scaleY;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, snipRect.x * scaleX, snipRect.y * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        setSnipImage(canvas.toDataURL('image/png'));
        toast.success('Area captured');
      }
    };
    img.src = screenshotData;
  }, [snipRect, snipDrawing, mode, screenshotData]);

  // Annotation canvas rendering
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of annotationStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      ctx.stroke();
    }
  }, [annotationStrokes]);

  // Composite annotations onto screenshot
  const compositeAnnotations = useCallback(async (baseDataUrl: string): Promise<string> => {
    if (annotationStrokes.length === 0) return baseDataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(baseDataUrl); return; }
        ctx.drawImage(img, 0, 0);
        const scaleX = img.naturalWidth / window.innerWidth;
        const scaleY = img.naturalHeight / window.innerHeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const stroke of annotationStrokes) {
          if (stroke.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width * Math.max(scaleX, scaleY);
          ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
          for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
          ctx.stroke();
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(baseDataUrl);
      img.src = baseDataUrl;
    });
  }, [annotationStrokes]);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(`.${PANEL_CLASS}`)) return;
    if (mode === 'picker') return;
    if (annotateMode) {
      setAnnotating(true);
      setAnnotationStrokes((prev) => [...prev, { points: [{ x: e.clientX, y: e.clientY }], color: annotationColor, width: annotationWidth }]);
      return;
    }
    if (mode === 'snip') {
      setSnipDrawing(true);
      setSnipStart({ x: e.clientX, y: e.clientY });
      setSnipRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
      return;
    }
    setDrawing(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left || 0);
    const y = e.clientY - (rect?.top || 0);
    setDrawStart({ x, y });
    setHighlightRect({ x, y, width: 0, height: 0 });
  }, [mode, annotateMode, annotationColor, annotationWidth]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'picker') return;
    if (annotateMode && annotating) {
      setAnnotationStrokes((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last) last.points = [...last.points, { x: e.clientX, y: e.clientY }];
        return updated;
      });
      return;
    }
    if (mode === 'snip' && snipDrawing && snipStart) {
      setSnipRect({
        x: Math.min(snipStart.x, e.clientX),
        y: Math.min(snipStart.y, e.clientY),
        width: Math.abs(e.clientX - snipStart.x),
        height: Math.abs(e.clientY - snipStart.y),
      });
      return;
    }
    if (!drawing || !drawStart) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    const curX = e.clientX - (rect?.left || 0);
    const curY = e.clientY - (rect?.top || 0);
    setHighlightRect({
      x: Math.min(drawStart.x, curX),
      y: Math.min(drawStart.y, curY),
      width: Math.abs(curX - drawStart.x),
      height: Math.abs(curY - drawStart.y),
    });
  }, [mode, drawing, drawStart, snipDrawing, snipStart, annotateMode, annotating]);

  const onMouseUp = useCallback(() => {
    if (annotateMode) { setAnnotating(false); return; }
    if (mode === 'snip') {
      setSnipDrawing(false);
      if (snipRect && (snipRect.width < 10 || snipRect.height < 10)) setSnipRect(null);
      return;
    }
    setDrawing(false);
    if (highlightRect && (highlightRect.width < 10 || highlightRect.height < 10)) setHighlightRect(null);
  }, [mode, highlightRect, snipRect, annotateMode]);

  const removeElement = useCallback((index: number) => {
    setSelectedElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Submit
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please provide a title');
      return;
    }

    setSubmitting(true);
    try {
      const consoleLogs = (window.__consoleBuffer || []).slice(-50);

      const elementsBlock = selectedElements.length > 0
        ? [
            `\n## Selected Elements (${selectedElements.length})`,
            ...selectedElements.map((el, i) => [
              `### Element ${i + 1}: \`<${el.tag}>\``,
              el.id ? `- **ID**: \`${el.id}\`` : '',
              el.classes.length ? `- **Classes**: \`${el.classes.join(' ')}\`` : '',
              el.componentName ? `- **Component**: \`${el.componentName}\`` : '',
              `- **Selector**: \`${el.selector}\``,
              `- **Position**: (${Math.round(el.rect.x)}, ${Math.round(el.rect.y)}) ${Math.round(el.rect.width)}x${Math.round(el.rect.height)}`,
              el.text ? `- **Text**: "${el.text.slice(0, 100)}${el.text.length > 100 ? '...' : ''}"` : '',
            ].filter(Boolean).join('\n')),
          ].join('\n')
        : '';

      const contextBlock = [
        `## Dev Capture Context`,
        `- **Page**: \`${pageUrl}\``,
        `- **Browser**: ${navigator.userAgent.slice(0, 100)}`,
        `- **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
        `- **Console Errors**: ${consoleErrors}`,
        `- **Console Warnings**: ${consoleWarnings}`,
        `- **Timestamp**: ${new Date().toISOString()}`,
        highlightRect ? `- **Highlight area**: (${highlightRect.x}, ${highlightRect.y}) ${highlightRect.width}x${highlightRect.height}` : '',
        annotationStrokes.length > 0 ? `- **Annotations**: ${annotationStrokes.length} freehand stroke(s)` : '',
        '',
        description ? `## Description\n${description}` : '',
        elementsBlock,
        consoleLogs.length > 0 ? `\n## Recent Console Logs\n\`\`\`\n${consoleLogs.map((l) => `[${l.level}] ${l.message}`).join('\n')}\n\`\`\`` : '',
      ].filter(Boolean).join('\n');

      const body = {
        title: title.trim(),
        description: contextBlock,
        priority,
        category: category === 'ui-ux' ? 'ui' : category,
        submitted_by: 'dev-capture',
        platform: window.location.hostname,
      };

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      const result = await res.json();
      const requestId = result?.request?.id;

      // Upload screenshots
      const finalScreenshot = screenshotData ? await compositeAnnotations(screenshotData) : '';
      if (finalScreenshot && requestId) {
        try { await uploadScreenshot(baseUrl, requestId, finalScreenshot, `dev-capture-${Date.now()}.png`); } catch { /* ignore */ }
      }
      if (snipImage && requestId) {
        try { await uploadScreenshot(baseUrl, requestId, snipImage, `dev-snip-${Date.now()}.png`); } catch { /* ignore */ }
      }
      if (selectedElements.length > 0 && requestId) {
        for (let i = 0; i < selectedElements.length; i++) {
          const el = selectedElements[i];
          if (!el.screenshot) continue;
          try { await uploadScreenshot(baseUrl, requestId, el.screenshot, `element-${i + 1}-${el.tag}-${Date.now()}.png`); } catch { /* ignore */ }
        }
      }

      setSubmitted(true);
      toast.success(`Request ${requestId || ''} created`);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Dev capture submit failed:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const panelMinimized = mode === 'picker' || mode === 'snip';

  return (
    <div
      ref={overlayRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      className={OVERLAY_CLASS}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        cursor: annotateMode || mode === 'snip' || (mode === 'screenshot' && drawing) ? 'crosshair' : 'default',
        pointerEvents: pickerActive ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes devCapturePanelSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes devCaptureOverlayPulse {
          0%, 100% { box-shadow: inset 0 0 0 2px rgba(6,182,212,0.15); }
          50% { box-shadow: inset 0 0 0 2px rgba(6,182,212,0.35); }
        }
        @keyframes devCaptureSuccessScale {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes devCapturePickerPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        .${OVERLAY_CLASS} { animation: devCaptureOverlayPulse 2.5s ease-in-out infinite; }
        .${PANEL_CLASS}::-webkit-scrollbar { width: 5px; }
        .${PANEL_CLASS}::-webkit-scrollbar-track { background: transparent; }
        .${PANEL_CLASS}::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.2); border-radius: 3px; }
        .dc-input:focus { border-color: rgba(6,182,212,0.5) !important; box-shadow: 0 0 0 2px rgba(6,182,212,0.1) !important; outline: none; }
        .dc-mode-btn { transition: all 0.15s ease; cursor: pointer; }
        .dc-mode-btn:hover { transform: translateY(-1px); }
        .dc-priority-btn, .dc-category-btn { transition: all 0.15s ease; }
        .dc-priority-btn:hover, .dc-category-btn:hover { transform: translateY(-1px); }
        .dc-element-chip { transition: all 0.15s ease; }
        .dc-element-chip:hover { border-color: rgba(6,182,212,0.4) !important; }
      `}</style>

      {/* Dark overlay with screenshot */}
      {!pickerActive && screenshotData && (
        <img src={screenshotData} alt="Page capture" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25, pointerEvents: 'none' }} draggable={false} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: pickerActive ? 'rgba(2,6,23,0.15)' : mode === 'snip' ? 'rgba(2,6,23,0.35)' : 'rgba(2,6,23,0.78)',
        pointerEvents: 'none', transition: 'background 0.3s ease',
      }} />

      {/* Highlight rectangle */}
      {mode === 'screenshot' && highlightRect && highlightRect.width > 10 && highlightRect.height > 10 && (
        <div style={{
          position: 'absolute', left: highlightRect.x, top: highlightRect.y,
          width: highlightRect.width, height: highlightRect.height,
          border: '2px dashed #22d3ee', borderRadius: 4,
          background: 'rgba(6,182,212,0.1)', boxShadow: '0 0 20px rgba(6,182,212,0.25)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}

      {/* Snip rectangle */}
      {mode === 'snip' && snipRect && snipRect.width > 5 && snipRect.height > 5 && (
        <div style={{
          position: 'absolute', left: snipRect.x, top: snipRect.y,
          width: snipRect.width, height: snipRect.height,
          border: '2px solid #a78bfa', borderRadius: 4,
          background: 'rgba(167,139,250,0.08)', boxShadow: '0 0 20px rgba(167,139,250,0.2)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}

      {/* Annotation canvas */}
      <canvas ref={annotationCanvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }} />

      {/* Picker hover highlight */}
      {pickerActive && hoverRect && (
        <div className={HIGHLIGHT_CLASS} style={{
          position: 'fixed', left: hoverRect.x - 2, top: hoverRect.y - 2,
          width: hoverRect.width + 4, height: hoverRect.height + 4,
          border: '2px solid #22d3ee', borderRadius: 4,
          background: 'rgba(6,182,212,0.08)', boxShadow: '0 0 16px rgba(6,182,212,0.3)',
          pointerEvents: 'none', zIndex: 999998,
          animation: 'devCapturePickerPulse 1.5s ease-in-out infinite',
        }}>
          <div style={{
            position: 'absolute', top: -22, left: 0,
            background: 'rgba(6,182,212,0.9)', color: '#fff',
            fontSize: 10, fontWeight: 600, padding: '2px 8px',
            borderRadius: '4px 4px 0 0', fontFamily: 'monospace',
          }}>
            {`<${hoverTag}>`} {Math.round(hoverRect.width)}x{Math.round(hoverRect.height)}
          </div>
        </div>
      )}

      {/* Capturing spinner */}
      {capturing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, pointerEvents: 'auto' }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)',
            padding: '28px 40px', borderRadius: 16,
            border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <Loader2 size={36} color="#22d3ee" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Capturing page...</span>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        background: 'linear-gradient(180deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.6) 70%, transparent 100%)',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
            border: '1px solid rgba(6,182,212,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={16} color="#22d3ee" />
          </div>
          <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>Dev Capture</span>

          {/* Mode toolbar */}
          <div style={{
            display: 'flex', gap: 4, marginLeft: 12,
            background: 'rgba(15,23,42,0.6)', padding: 3, borderRadius: 10,
            border: '1px solid rgba(51,65,85,0.4)',
          }}>
            <button className="dc-mode-btn" onClick={() => { setMode('screenshot'); setHoverRect(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, background: mode === 'screenshot' ? 'rgba(6,182,212,0.15)' : 'transparent', color: mode === 'screenshot' ? '#22d3ee' : '#64748b' }}>
              <Camera size={13} /> Screenshot
            </button>
            <button className="dc-mode-btn" onClick={() => setMode(mode === 'picker' ? 'screenshot' : 'picker')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, background: mode === 'picker' ? 'rgba(6,182,212,0.15)' : 'transparent', color: mode === 'picker' ? '#22d3ee' : '#64748b' }}>
              <Crosshair size={13} /> Select Element
            </button>
            <button className="dc-mode-btn" onClick={() => { setMode(mode === 'snip' ? 'screenshot' : 'snip'); setSnipRect(null); setSnipImage(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, background: mode === 'snip' ? 'rgba(167,139,250,0.15)' : 'transparent', color: mode === 'snip' ? '#a78bfa' : '#64748b' }}>
              <Scissors size={13} /> Snip Area
            </button>
            <button className="dc-mode-btn" onClick={() => setAnnotateMode(!annotateMode)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, background: annotateMode ? 'rgba(239,68,68,0.15)' : 'transparent', color: annotateMode ? '#ef4444' : '#64748b' }}>
              <Pencil size={13} /> Annotate
            </button>
          </div>

          {/* Annotation tools */}
          {annotateMode && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4,
              background: 'rgba(15,23,42,0.6)', padding: '3px 8px', borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.25)',
            }}>
              {ANNOTATION_COLORS.map((c) => (
                <button key={c.value} title={c.label} onClick={() => setAnnotationColor(c.value)}
                  style={{ width: 18, height: 18, borderRadius: '50%', background: c.value, border: annotationColor === c.value ? '2px solid #e2e8f0' : '2px solid transparent', cursor: 'pointer', boxShadow: annotationColor === c.value ? `0 0 8px ${c.value}80` : 'none' }} />
              ))}
              <div style={{ width: 1, height: 16, background: 'rgba(51,65,85,0.5)', margin: '0 2px' }} />
              {ANNOTATION_WIDTHS.map((w) => (
                <button key={w.value} title={w.label} onClick={() => setAnnotationWidth(w.value)} className="dc-mode-btn"
                  style={{ padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 500, cursor: 'pointer', background: annotationWidth === w.value ? 'rgba(239,68,68,0.15)' : 'transparent', color: annotationWidth === w.value ? '#ef4444' : '#64748b' }}>
                  {w.label}
                </button>
              ))}
              {annotationStrokes.length > 0 && (
                <>
                  <div style={{ width: 1, height: 16, background: 'rgba(51,65,85,0.5)', margin: '0 2px' }} />
                  <button title="Clear" onClick={() => setAnnotationStrokes([])} className="dc-mode-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#64748b' }}>
                    <Eraser size={11} /> Clear
                  </button>
                </>
              )}
            </div>
          )}

          {/* Badges */}
          {selectedElements.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#22d3ee', background: 'rgba(6,182,212,0.12)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.25)' }}>
              {selectedElements.length} element{selectedElements.length > 1 ? 's' : ''} selected
            </span>
          )}

          {/* Mode hint */}
          <span style={{ color: '#64748b', fontSize: 12, background: 'rgba(30,41,59,0.6)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(51,65,85,0.3)' }}>
            {annotateMode && 'Draw freehand annotations'}
            {!annotateMode && mode === 'screenshot' && 'Draw a rectangle to highlight'}
            {!annotateMode && mode === 'picker' && 'Click elements to select them'}
            {!annotateMode && mode === 'snip' && 'Draw to capture a region'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: 11 }}>
            <Keyboard size={12} />
            <span>ESC {annotateMode || mode !== 'screenshot' ? 'to exit mode' : 'to close'}</span>
          </div>
          <button onClick={onClose} aria-label="Close DevCapture"
            style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}>
            <X size={18} color="#94a3b8" />
          </button>
        </div>
      </div>

      {/* SIDE PANEL */}
      <div
        className={PANEL_CLASS}
        style={{
          position: 'absolute', top: 60, right: 16, bottom: 16,
          width: panelMinimized ? 320 : 420, maxWidth: panelMinimized ? 320 : 420,
          zIndex: 100,
          background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px) saturate(1.4)',
          borderRadius: 14, border: '1px solid rgba(6,182,212,0.12)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(6,182,212,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'devCapturePanelSlideIn 0.3s cubic-bezier(0.16,1,0.3,1)',
          transition: 'width 0.3s ease, max-width 0.3s ease',
          pointerEvents: 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid rgba(6,182,212,0.08)',
          background: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, transparent 100%)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bug size={16} color="#22d3ee" />
            <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>Submit Dev Request</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(30,41,59,0.5)', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(51,65,85,0.3)', fontFamily: 'monospace' }}>
              {pageUrl}
            </span>
            {consoleErrors > 0 && (
              <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, background: 'rgba(127,29,29,0.25)', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={10} /> {consoleErrors} error{consoleErrors > 1 ? 's' : ''}
              </span>
            )}
            {consoleWarnings > 0 && (
              <span style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(120,53,15,0.25)', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.25)' }}>
                {consoleWarnings} warning{consoleWarnings > 1 ? 's' : ''}
              </span>
            )}
            {screenshotData && (
              <span style={{ fontSize: 11, color: '#22c55e', background: 'rgba(22,101,52,0.2)', padding: '3px 9px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)' }}>
                Screenshot captured
              </span>
            )}
          </div>
        </div>

        {/* Scrollable form area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Screenshot preview */}
          {screenshotData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <button onClick={() => setScreenshotCollapsed(!screenshotCollapsed)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: screenshotCollapsed ? 8 : '8px 8px 0 0', padding: '7px 12px', cursor: 'pointer', width: '100%', color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Camera size={12} color="#22d3ee" />
                  <span>Screenshot Preview</span>
                </div>
                {screenshotCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              {!screenshotCollapsed && (
                <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid rgba(51,65,85,0.4)', borderTop: 'none', position: 'relative', maxHeight: 200 }}>
                  <img src={screenshotData} alt="Captured screenshot" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover', objectPosition: 'top' }} />
                  {highlightRect && highlightRect.width > 10 && (
                    <div style={{
                      position: 'absolute',
                      left: `${(highlightRect.x / window.innerWidth) * 100}%`,
                      top: `${(highlightRect.y / window.innerHeight) * 100}%`,
                      width: `${(highlightRect.width / window.innerWidth) * 100}%`,
                      height: `${(highlightRect.height / window.innerHeight) * 100}%`,
                      border: '2px dashed #22d3ee', borderRadius: 2, background: 'rgba(6,182,212,0.15)', pointerEvents: 'none',
                    }} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Snip preview */}
          {snipImage && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(167,139,250,0.3)', maxHeight: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>
                  <Scissors size={11} /> Snipped Area
                </div>
                <button onClick={() => { setSnipImage(''); setSnipRect(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  <X size={12} color="#94a3b8" />
                </button>
              </div>
              <img src={snipImage} alt="Snipped area" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 120, objectFit: 'contain', background: 'rgba(15,23,42,0.5)' }} />
            </div>
          )}

          {/* Selected elements */}
          {selectedElements.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Crosshair size={12} color="#22d3ee" /> Selected Elements ({selectedElements.length})
                </label>
                <button onClick={() => setSelectedElements([])} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4 }}>
                  <Trash2 size={10} /> Clear all
                </button>
              </div>
              {selectedElements.map((el, i) => {
                const tagColor = getTagColor(el.tag);
                return (
                  <div key={`${el.selector}-${i}`} className="dc-element-chip" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.4)' }}>
                    {el.screenshot ? (
                      <div style={{ width: 48, height: 36, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(51,65,85,0.5)', flexShrink: 0, background: 'rgba(2,6,23,0.5)' }}>
                        <img src={el.screenshot} alt={`Element ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: 48, height: 36, borderRadius: 4, border: '1px solid rgba(51,65,85,0.5)', flexShrink: 0, background: 'rgba(2,6,23,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#475569' }}>
                        no img
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: tagColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', fontFamily: 'monospace' }}>{'<'}{el.tag}{'>'}</span>
                        {el.id && <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>#{el.id}</span>}
                      </div>
                      {el.text && <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{el.text.slice(0, 60)}{el.text.length > 60 ? '...' : ''}</div>}
                    </div>
                    <button onClick={() => removeElement(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, flexShrink: 0, display: 'flex' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                      <X size={14} color="#64748b" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block', fontWeight: 500 }}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue or improvement..."
              className="dc-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0', fontSize: 13, outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}
              autoFocus />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, display: 'block', fontWeight: 500 }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="dc-input"
              style={{ width: '100%', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.5)', color: '#e2e8f0', fontSize: 13, minHeight: 100, borderRadius: 8, resize: 'vertical', padding: '9px 12px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s' }} />
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'block', fontWeight: 500 }}>Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map((p) => {
                const isActive = priority === p.value;
                return (
                  <button key={p.value} onClick={() => setPriority(p.value)} className="dc-priority-btn"
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: 'pointer', background: isActive ? `${p.color}18` : 'rgba(15,23,42,0.5)', border: `1.5px solid ${isActive ? `${p.color}80` : 'rgba(51,65,85,0.4)'}`, color: isActive ? p.color : '#64748b' }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'block', fontWeight: 500 }}>Category</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isActive = category === c.value;
                return (
                  <button key={c.value} onClick={() => setCategory(c.value)} className="dc-category-btn"
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: isActive ? 'rgba(6,182,212,0.1)' : 'rgba(15,23,42,0.5)', border: `1.5px solid ${isActive ? 'rgba(6,182,212,0.45)' : 'rgba(51,65,85,0.4)'}`, color: isActive ? '#22d3ee' : '#64748b' }}>
                    <Icon size={13} /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Submit footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(6,182,212,0.08)', background: 'linear-gradient(180deg, transparent, rgba(6,182,212,0.02))', flexShrink: 0 }}>
          {submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 0', animation: 'devCaptureSuccessScale 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
              <CheckCircle2 size={20} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: 15, fontWeight: 600 }}>Request submitted!</span>
            </div>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !title.trim()}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                cursor: submitting || !title.trim() ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: submitting || !title.trim() ? 'rgba(51,65,85,0.4)' : 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
                color: submitting || !title.trim() ? '#64748b' : '#ffffff',
                boxShadow: submitting || !title.trim() ? 'none' : '0 4px 16px rgba(6,182,212,0.25)',
                transition: 'all 0.2s ease',
                opacity: submitting || !title.trim() ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!submitting && title.trim()) { e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
              {submitting ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>) : (<><Send size={15} /> Submit to Dev Logs</>)}
            </button>
          )}
        </div>
      </div>

      {/* Bottom-left shortcut hint */}
      {!capturing && (
        <div style={{
          position: 'absolute', bottom: 20, left: 20, zIndex: 100,
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#475569', fontSize: 11,
          background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)',
          padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(51,65,85,0.3)',
          pointerEvents: 'auto',
        }}>
          <Keyboard size={13} color="#475569" />
          <span>
            <kbd style={{ background: 'rgba(51,65,85,0.4)', padding: '1px 5px', borderRadius: 3, fontSize: 10, border: '1px solid rgba(71,85,105,0.4)' }}>Ctrl</kbd>
            {' + '}
            <kbd style={{ background: 'rgba(51,65,85,0.4)', padding: '1px 5px', borderRadius: 3, fontSize: 10, border: '1px solid rgba(71,85,105,0.4)' }}>D</kbd>
            {' to capture'}
          </span>
        </div>
      )}
    </div>
  );
};

export default DevCapture;
