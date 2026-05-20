export interface NetworkLog {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  timestamp: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
  isMocked: boolean;
}

export interface MockRule {
  id: string;
  name: string;
  urlPattern: string; // Regex string or exact match
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  responseStatus: number;
  responseBody: string;
  responseHeaders: string; // JSON string
  delayMs: number;
  isActive: boolean;
  createdAt: string;
}

export interface ConsoleLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  timestamp: string;
  stack?: string;
}

export interface SessionMetrics {
  totalRequests: number;
  errorRequests: number;
  averageLatency: number;
  mockedRequests: number;
  slowestEndpoint: string;
  uptime: number;
}
