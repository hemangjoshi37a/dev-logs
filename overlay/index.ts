/**
 * Dev Logs Overlay — Self-contained script that injects a floating bug button
 * and capture modal into any web page.
 *
 * Usage: <script src="http://localhost:3333/overlay.js"></script>
 *
 * The overlay captures screenshots, console logs, element metadata, and
 * annotations, then submits them to the dev-logs backend API.
 */

(function devLogsOverlay() {
  // Prevent double-initialization
  if ((window as any).__devLogsOverlayInstalled) return;
  (window as any).__devLogsOverlayInstalled = true;

  // Determine the dev-logs server URL from the script tag's src
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const serverUrl = scriptTag
    ? new URL(scriptTag.src).origin
    : 'http://localhost:3334';

  // -----------------------------------------------------------------------
  // Console interceptor
  // -----------------------------------------------------------------------
  interface ConsoleEntry {
    level: string;
    message: string;
    timestamp: string;
  }

  const consoleBuffer: ConsoleEntry[] = [];
  const MAX_BUFFER = 100;
  const origError = console.error;
  const origWarn = console.warn;

  console.error = (...args: unknown[]) => {
    consoleBuffer.push({
      level: 'error',
      message: args.map(String).join(' ').slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    if (consoleBuffer.length > MAX_BUFFER) consoleBuffer.shift();
    origError(...args);
  };

  console.warn = (...args: unknown[]) => {
    consoleBuffer.push({
      level: 'warn',
      message: args.map(String).join(' ').slice(0, 500),
      timestamp: new Date().toISOString(),
    });
    if (consoleBuffer.length > MAX_BUFFER) consoleBuffer.shift();
    origWarn(...args);
  };

  (window as any).__consoleBuffer = consoleBuffer;

  // -----------------------------------------------------------------------
  // Styles (injected inline)
  // -----------------------------------------------------------------------
  const STYLES = `
    .dl-floating-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99990;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .dl-floating-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(168, 85, 247, 0.6);
    }
    .dl-floating-btn svg {
      width: 22px;
      height: 22px;
      color: white;
    }
    .dl-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
    }
    .dl-overlay.active {
      display: block;
    }
    .dl-overlay-bg {
      position: absolute;
      inset: 0;
      background: rgba(2, 6, 23, 0.78);
    }
    .dl-panel {
      position: absolute;
      top: 60px;
      right: 16px;
      bottom: 16px;
      width: 400px;
      background: rgba(10, 15, 30, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 14px;
      border: 1px solid rgba(6, 182, 212, 0.12);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dl-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    @keyframes dl-slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .dl-panel-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(6, 182, 212, 0.08);
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.04) 0%, transparent 100%);
    }
    .dl-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dl-panel-footer {
      padding: 14px 18px;
      border-top: 1px solid rgba(6, 182, 212, 0.08);
    }
    .dl-input {
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid rgba(51, 65, 85, 0.5);
      background: rgba(15, 23, 42, 0.7);
      color: #e2e8f0;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }
    .dl-input:focus {
      border-color: rgba(6, 182, 212, 0.5);
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.1);
    }
    .dl-textarea {
      min-height: 80px;
      resize: vertical;
    }
    .dl-label {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 6px;
      display: block;
      font-weight: 500;
    }
    .dl-btn-group {
      display: flex;
      gap: 8px;
    }
    .dl-btn-option {
      flex: 1;
      padding: 7px 0;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
      border: 1.5px solid rgba(51, 65, 85, 0.4);
      background: rgba(15, 23, 42, 0.5);
      color: #64748b;
    }
    .dl-btn-option.active {
      border-color: rgba(6, 182, 212, 0.45);
      background: rgba(6, 182, 212, 0.1);
      color: #22d3ee;
      font-weight: 600;
    }
    .dl-submit-btn {
      width: 100%;
      padding: 11px 0;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      background: linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee);
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(6, 182, 212, 0.25);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .dl-submit-btn:hover {
      box-shadow: 0 6px 24px rgba(6, 182, 212, 0.35);
      transform: translateY(-1px);
    }
    .dl-submit-btn:disabled {
      background: rgba(51, 65, 85, 0.4);
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }
    .dl-close-btn {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.4);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      color: #94a3b8;
    }
    .dl-close-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
    }
    .dl-badge {
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .dl-screenshot-preview {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(51, 65, 85, 0.4);
      max-height: 160px;
    }
    .dl-screenshot-preview img {
      width: 100%;
      height: auto;
      display: block;
      max-height: 160px;
      object-fit: cover;
      object-position: top;
    }
    .dl-toolbar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      background: linear-gradient(180deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.6) 70%, transparent 100%);
      z-index: 100;
    }
  `;

  // -----------------------------------------------------------------------
  // Inject styles
  // -----------------------------------------------------------------------
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  document.head.appendChild(styleEl);

  // -----------------------------------------------------------------------
  // Bug icon SVG
  // -----------------------------------------------------------------------
  const BUG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`;

  // -----------------------------------------------------------------------
  // Create floating button
  // -----------------------------------------------------------------------
  const btn = document.createElement('button');
  btn.className = 'dl-floating-btn';
  btn.innerHTML = BUG_SVG;
  btn.title = 'Report Bug / Submit Request (Ctrl+D)';
  btn.setAttribute('aria-label', 'Open Dev Capture');
  document.body.appendChild(btn);

  // -----------------------------------------------------------------------
  // Screenshot capture using html-to-image (loaded dynamically)
  // -----------------------------------------------------------------------
  let htmlToImage: any = null;

  async function loadHtmlToImage() {
    if (htmlToImage) return htmlToImage;
    try {
      // Try to load from the dev-logs server
      const script = document.createElement('script');
      script.src = serverUrl + '/html-to-image.min.js';
      document.head.appendChild(script);
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject();
      });
      htmlToImage = (window as any).htmlToImage;
      return htmlToImage;
    } catch {
      return null;
    }
  }

  async function captureScreenshot(): Promise<string> {
    try {
      const lib = await loadHtmlToImage();
      if (!lib) return '';
      return await lib.toPng(document.body, {
        cacheBust: true,
        width: window.innerWidth,
        height: window.innerHeight,
        style: { transform: 'none' },
      });
    } catch {
      return '';
    }
  }

  // -----------------------------------------------------------------------
  // CSS Selector generation
  // -----------------------------------------------------------------------
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
        const classes = current.className.trim().split(/\s+/)
          .filter(c => !c.startsWith('dl-'))
          .slice(0, 2).join('.');
        if (classes) selector += `.${classes}`;
      }
      path = path ? `${selector} > ${path}` : selector;
      current = current.parentElement;
    }
    return path || el.tagName.toLowerCase();
  }

  // -----------------------------------------------------------------------
  // Create overlay
  // -----------------------------------------------------------------------
  let overlayOpen = false;
  let screenshotData = '';

  function createOverlay() {
    // Remove existing overlay if any
    const existing = document.querySelector('.dl-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dl-overlay active';

    const consoleErrors = consoleBuffer.filter(e => e.level === 'error').length;
    const consoleWarns = consoleBuffer.filter(e => e.level === 'warn').length;

    overlay.innerHTML = `
      <div class="dl-overlay-bg"></div>
      <div class="dl-panel">
        <div class="dl-panel-header">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${BUG_SVG.replace('width="22"', 'width="16"').replace('height="22"', 'height="16"')}
              <span style="font-size:15px;font-weight:600;">Submit Dev Request</span>
            </div>
            <button class="dl-close-btn" id="dl-close">&times;</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            <span class="dl-badge" style="background:rgba(30,41,59,0.7);border:1px solid rgba(51,65,85,0.4);color:#94a3b8;">${window.location.pathname}</span>
            <span class="dl-badge" style="background:rgba(30,41,59,0.5);border:1px solid rgba(51,65,85,0.3);color:#64748b;font-family:monospace;">${window.innerWidth}x${window.innerHeight}</span>
            ${consoleErrors > 0 ? `<span class="dl-badge" style="background:rgba(127,29,29,0.25);border:1px solid rgba(239,68,68,0.25);color:#ef4444;font-weight:600;">${consoleErrors} error${consoleErrors > 1 ? 's' : ''}</span>` : ''}
            ${consoleWarns > 0 ? `<span class="dl-badge" style="background:rgba(120,53,15,0.25);border:1px solid rgba(245,158,11,0.25);color:#f59e0b;">${consoleWarns} warning${consoleWarns > 1 ? 's' : ''}</span>` : ''}
            ${screenshotData ? `<span class="dl-badge" style="background:rgba(22,101,52,0.2);border:1px solid rgba(34,197,94,0.2);color:#22c55e;">Screenshot captured</span>` : ''}
          </div>
        </div>
        <div class="dl-panel-body">
          ${screenshotData ? `<div class="dl-screenshot-preview"><img src="${screenshotData}" alt="Screenshot"/></div>` : ''}
          <div>
            <label class="dl-label">Title *</label>
            <input type="text" class="dl-input" id="dl-title" placeholder="Brief summary of the issue..." autofocus/>
          </div>
          <div>
            <label class="dl-label">Description</label>
            <textarea class="dl-input dl-textarea" id="dl-description" placeholder="Describe the issue in detail... (Markdown supported)"></textarea>
          </div>
          <div>
            <label class="dl-label">Priority</label>
            <div class="dl-btn-group" id="dl-priority">
              <button class="dl-btn-option" data-value="low" style="--accent:#3b82f6;">Low</button>
              <button class="dl-btn-option active" data-value="medium" style="--accent:#f59e0b;">Medium</button>
              <button class="dl-btn-option" data-value="high" style="--accent:#f97316;">High</button>
              <button class="dl-btn-option" data-value="critical" style="--accent:#ef4444;">Critical</button>
            </div>
          </div>
          <div>
            <label class="dl-label">Category</label>
            <div class="dl-btn-group" id="dl-category">
              <button class="dl-btn-option active" data-value="bug">Bug</button>
              <button class="dl-btn-option" data-value="enhancement">Enhancement</button>
              <button class="dl-btn-option" data-value="feature">Feature</button>
              <button class="dl-btn-option" data-value="ui">UI/UX</button>
            </div>
          </div>
        </div>
        <div class="dl-panel-footer">
          <button class="dl-submit-btn" id="dl-submit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Submit to Dev Logs
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Wire up events
    const closeBtn = overlay.querySelector('#dl-close')!;
    closeBtn.addEventListener('click', closeOverlay);

    // Priority buttons
    const priorityGroup = overlay.querySelector('#dl-priority')!;
    priorityGroup.querySelectorAll('.dl-btn-option').forEach(b => {
      b.addEventListener('click', () => {
        priorityGroup.querySelectorAll('.dl-btn-option').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // Category buttons
    const categoryGroup = overlay.querySelector('#dl-category')!;
    categoryGroup.querySelectorAll('.dl-btn-option').forEach(b => {
      b.addEventListener('click', () => {
        categoryGroup.querySelectorAll('.dl-btn-option').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // Submit
    const submitBtn = overlay.querySelector('#dl-submit') as HTMLButtonElement;
    submitBtn.addEventListener('click', handleSubmit);

    // Close on background click
    overlay.querySelector('.dl-overlay-bg')!.addEventListener('click', closeOverlay);

    // ESC to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOverlay();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  function closeOverlay() {
    const overlay = document.querySelector('.dl-overlay');
    if (overlay) overlay.remove();
    overlayOpen = false;
    screenshotData = '';
  }

  async function openOverlay() {
    if (overlayOpen) return;
    overlayOpen = true;

    // Capture screenshot first
    screenshotData = await captureScreenshot();
    createOverlay();
  }

  async function handleSubmit() {
    const titleEl = document.querySelector('#dl-title') as HTMLInputElement;
    const descEl = document.querySelector('#dl-description') as HTMLTextAreaElement;
    const title = titleEl?.value?.trim();

    if (!title) {
      titleEl.style.borderColor = '#ef4444';
      return;
    }

    const priority = document.querySelector('#dl-priority .dl-btn-option.active')?.getAttribute('data-value') || 'medium';
    const category = document.querySelector('#dl-category .dl-btn-option.active')?.getAttribute('data-value') || 'bug';

    const consoleLogs = consoleBuffer.slice(-50);
    const description = descEl?.value || '';

    const contextBlock = [
      `## Dev Capture Context`,
      `- **Page**: \`${window.location.href}\``,
      `- **Browser**: ${navigator.userAgent.slice(0, 100)}`,
      `- **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
      `- **Console Errors**: ${consoleBuffer.filter(e => e.level === 'error').length}`,
      `- **Console Warnings**: ${consoleBuffer.filter(e => e.level === 'warn').length}`,
      `- **Timestamp**: ${new Date().toISOString()}`,
      '',
      description ? `## Description\n${description}` : '',
      consoleLogs.length > 0 ? `\n## Recent Console Logs\n\`\`\`\n${consoleLogs.map(l => `[${l.level}] ${l.message}`).join('\n')}\n\`\`\`` : '',
    ].filter(Boolean).join('\n');

    const submitBtn = document.querySelector('#dl-submit') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting...';

    try {
      const res = await fetch(`${serverUrl}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: contextBlock,
          priority,
          category,
          submitted_by: 'overlay',
          platform: window.location.hostname,
        }),
      });

      const data = await res.json();
      const requestId = data?.request?.id;

      // Upload screenshot if available
      if (screenshotData && requestId) {
        try {
          const blob = await (await fetch(screenshotData)).blob();
          const formData = new FormData();
          formData.append('file', blob, `capture-${Date.now()}.png`);
          await fetch(`${serverUrl}/api/requests/${requestId}/attachments`, {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.warn('Failed to upload screenshot:', err);
        }
      }

      submitBtn.innerHTML = '&#10003; Submitted!';
      submitBtn.style.background = 'linear-gradient(135deg, #16a34a, #22c55e)';
      setTimeout(closeOverlay, 1200);
    } catch (err) {
      console.error('Dev Logs submit failed:', err);
      submitBtn.innerHTML = 'Failed — try again';
      submitBtn.disabled = false;
      submitBtn.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
    }
  }

  // -----------------------------------------------------------------------
  // Event listeners
  // -----------------------------------------------------------------------
  btn.addEventListener('click', openOverlay);

  // Ctrl+D shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      if (overlayOpen) {
        closeOverlay();
      } else {
        openOverlay();
      }
    }
  });

  // Custom event support
  window.addEventListener('dev-capture:open', () => openOverlay());

  console.log('[Dev Logs] Overlay loaded — press Ctrl+D or click the bug button to report');
})();
