import React, { ErrorInfo } from 'react';
import { createRequest } from '../lib/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  autoSubmit?: boolean;
  projectName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  submitted: boolean;
}

export class DevLogsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, submitted: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null, submitted: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('DevLogsErrorBoundary caught an error:', error, errorInfo);

    if (this.props.autoSubmit !== false) {
      this.submitToDevLogs(error, errorInfo);
    }
  }

  private async submitToDevLogs(error: Error, errorInfo: ErrorInfo) {
    try {
      const pageUrl = window.location.pathname;
      const platform = this.props.projectName || window.location.hostname;
      
      const contextBlock = [
        `**Auto-Captured Crash Report**`,
        `The application encountered an unexpected React rendering error.`,
        ``,
        `---`,
        `**Page**: \`${pageUrl}\`  |  **Viewport**: ${window.innerWidth}x${window.innerHeight}`,
        `**Browser**: ${navigator.userAgent.slice(0, 100)}`,
        `**Timestamp**: ${new Date().toISOString()}`,
        ``,
        `**Error Message**:`,
        `\`\`\`text`,
        `${error.name}: ${error.message}`,
        `\`\`\``,
        ``,
        `**Component Stack Trace**:`,
        `\`\`\`text`,
        `${errorInfo.componentStack}`,
        `\`\`\``,
        ``,
        `**Error Stack**:`,
        `\`\`\`text`,
        `${error.stack}`,
        `\`\`\``
      ].join('\n');

      const body = {
        title: `Crash: ${error.name} - ${error.message}`.slice(0, 100),
        description: contextBlock,
        priority: 'critical' as const,
        category: 'bug' as const,
        submitted_by: 'DevLogsErrorBoundary',
        platform: platform,
        tags: ['crash', 'react-error', 'auto-reported'],
      };

      await createRequest(body);
      this.setState({ submitted: true });
    } catch (err) {
      console.error('Failed to submit crash report to Dev Logs:', err);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-slate-200 font-sans">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            
            <div className="flex items-start gap-5">
              <div className="p-4 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 shrink-0">
                <AlertTriangle size={32} />
              </div>
              
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
                <p className="text-slate-400 text-sm mb-6">
                  The application encountered an unexpected error. 
                  {this.props.autoSubmit !== false && (
                    this.state.submitted 
                      ? <span className="ml-1 text-emerald-400 font-medium">A crash report has been automatically sent to your Dev-Logs dashboard.</span>
                      : <span className="ml-1 text-slate-500">Sending crash report to Dev-Logs...</span>
                  )}
                </p>

                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 overflow-x-auto">
                  <div className="text-red-400 font-mono text-sm font-semibold mb-2">
                    {this.state.error?.name}: {this.state.error?.message}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>

                <button 
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors border border-slate-700"
                >
                  <RefreshCw size={16} />
                  Reload Application
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
