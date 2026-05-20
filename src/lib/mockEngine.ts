import { MockRule, NetworkLog } from '../types/advanced';
import { v4 as uuidv4 } from 'uuid';

export class MockEngine {
  private rules: MockRule[] = [];
  private logs: NetworkLog[] = [];
  private originalFetch: typeof window.fetch;
  private originalXHR: typeof window.XMLHttpRequest;

  constructor() {
    this.originalFetch = window.fetch;
    this.originalXHR = window.XMLHttpRequest;
    this.loadRules();
  }

  public getRules(): MockRule[] {
    return [...this.rules];
  }

  public addRule(rule: Omit<MockRule, 'id' | 'createdAt'>): MockRule {
    const newRule: MockRule = {
      ...rule,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.rules.push(newRule);
    this.saveRules();
    return newRule;
  }

  public updateRule(id: string, updates: Partial<MockRule>) {
    this.rules = this.rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    this.saveRules();
  }

  public deleteRule(id: string) {
    this.rules = this.rules.filter((r) => r.id !== id);
    this.saveRules();
  }

  private saveRules() {
    localStorage.setItem('devLogs_mockRules', JSON.stringify(this.rules));
    
    // Sync with backend
    const port = window.location.port === '4444' ? '4445' : window.location.port;
    fetch(`http://${window.location.hostname}:${port}/api/system/mocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.rules)
    }).catch(console.error);
  }

  private async loadRules() {
    try {
      const stored = localStorage.getItem('devLogs_mockRules');
      if (stored) {
        this.rules = JSON.parse(stored);
      }
      
      // Try to load from backend
      const port = window.location.port === '4444' ? '4445' : window.location.port;
      const res = await fetch(`http://${window.location.hostname}:${port}/api/system/mocks`);
      if (res.ok) {
        const data = await res.json();
        if (data.mocks && data.mocks.length > 0) {
          this.rules = data.mocks;
          localStorage.setItem('devLogs_mockRules', JSON.stringify(this.rules));
        }
      }
    } catch (e) {
      console.error('Failed to load mock rules', e);
    }
  }

  public matchRule(url: string, method: string): MockRule | undefined {
    return this.rules.find((rule) => {
      if (!rule.isActive) return false;
      if (rule.method !== 'ALL' && rule.method !== method.toUpperCase()) return false;
      
      try {
        const regex = new RegExp(rule.urlPattern);
        return regex.test(url);
      } catch {
        return url.includes(rule.urlPattern);
      }
    });
  }

  public start() {
    this.interceptFetch();
    this.interceptXHR();
  }

  public stop() {
    window.fetch = this.originalFetch;
    window.XMLHttpRequest = this.originalXHR;
  }

  public getLogs(): NetworkLog[] {
    return [...this.logs];
  }

  private addLog(log: NetworkLog) {
    this.logs.unshift(log);
    if (this.logs.length > 1000) {
      this.logs.pop(); // keep last 1000
    }
    // Dispatch event for UI
    window.dispatchEvent(new CustomEvent('dev-logs:network-update', { detail: log }));
  }

  private interceptFetch() {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method || (input instanceof Request ? input.method : 'GET');
      const startTime = performance.now();

      const rule = this.matchRule(url, method);

      if (rule) {
        // Mock response
        if (rule.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, rule.delayMs));
        }

        let headers = {};
        try {
          headers = JSON.parse(rule.responseHeaders);
        } catch {}

        const response = new Response(rule.responseBody, {
          status: rule.responseStatus,
          headers: new Headers(headers),
        });

        this.addLog({
          id: uuidv4(),
          method,
          url,
          status: rule.responseStatus,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          requestHeaders: init?.headers as any || {},
          responseHeaders: headers,
          isMocked: true,
          requestBody: init?.body,
          responseBody: rule.responseBody
        });

        return response;
      }

      // Original fetch
      try {
        const response = await this.originalFetch(input, init);
        const clonedResponse = response.clone();
        
        // Try to read body for logging
        let resBody = '';
        try { resBody = await clonedResponse.text(); } catch {}

        this.addLog({
          id: uuidv4(),
          method,
          url,
          status: response.status,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          requestHeaders: init?.headers as any || {},
          responseHeaders: Object.fromEntries(response.headers.entries()),
          isMocked: false,
          requestBody: init?.body,
          responseBody: resBody
        });

        return response;
      } catch (error) {
        this.addLog({
          id: uuidv4(),
          method,
          url,
          status: 0,
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          requestHeaders: init?.headers as any || {},
          responseHeaders: {},
          isMocked: false,
          requestBody: init?.body,
          responseBody: String(error)
        });
        throw error;
      }
    };
  }

  private interceptXHR() {
    // simplified XHR interceptor for the sake of length, primarily using fetch nowadays, but good to have
    const engine = this;
    const XHR = window.XMLHttpRequest;
    
    window.XMLHttpRequest = function() {
      const xhr = new XHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      let _method = '';
      let _url = '';
      let _startTime = 0;

      xhr.open = function(method: string, url: string | URL, ...args: any[]) {
        _method = method;
        _url = url.toString();
        // @ts-ignore
        return originalOpen.apply(this, [method, url, ...args]);
      };

      xhr.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
        _startTime = performance.now();
        const rule = engine.matchRule(_url, _method);
        
        if (rule) {
          // If mocked, we simulate the XHR events
          setTimeout(() => {
            Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
            Object.defineProperty(xhr, 'status', { value: rule.responseStatus, writable: false });
            Object.defineProperty(xhr, 'responseText', { value: rule.responseBody, writable: false });
            
            engine.addLog({
              id: uuidv4(),
              method: _method,
              url: _url,
              status: rule.responseStatus,
              duration: performance.now() - _startTime,
              timestamp: new Date().toISOString(),
              requestHeaders: {},
              responseHeaders: {}, // would parse rule.responseHeaders
              isMocked: true,
              requestBody: body,
              responseBody: rule.responseBody
            });

            if (xhr.onreadystatechange) xhr.onreadystatechange(new Event('readystatechange'));
            if (xhr.onload) xhr.onload(new ProgressEvent('load'));
          }, rule.delayMs);
          return;
        }

        xhr.addEventListener('loadend', () => {
          engine.addLog({
            id: uuidv4(),
            method: _method,
            url: _url,
            status: xhr.status,
            duration: performance.now() - _startTime,
            timestamp: new Date().toISOString(),
            requestHeaders: {}, // Need to override setRequestHeader to capture
            responseHeaders: {}, // xhr.getAllResponseHeaders() parsing omitted for brevity
            isMocked: false,
            requestBody: body,
            responseBody: xhr.responseText
          });
        });

        return originalSend.apply(this, [body]);
      };

      return xhr;
    } as any;
  }
}

// Singleton instance
export const mockEngineInstance = new MockEngine();
