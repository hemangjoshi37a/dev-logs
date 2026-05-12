import { useState, useEffect } from 'react';
import FloatingPanel from './components/FloatingPanel';
import FloatingBugButton from './components/FloatingBugButton';
import DevCapture from './components/DevCapture';
import KanbanDashboard from './components/KanbanDashboard';
import InsightEngineLayout from './components/InsightEngineLayout';
import { installConsoleInterceptor, installNetworkInterceptor } from './components/DevCapture';

// Install interceptors on load
installConsoleInterceptor();
installNetworkInterceptor();

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [kanbanOpen, setKanbanOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);

  // Listen for custom events
  useEffect(() => {
    const togglePanel = () => setPanelOpen((prev) => !prev);
    const openKanban = () => {
      setPanelOpen(false);
      setKanbanOpen(true);
    };
    const openInsight = () => {
      setPanelOpen(false);
      setInsightOpen(true);
    };

    window.addEventListener('dev-capture:open', togglePanel);
    window.addEventListener('dev-logs:open-kanban', openKanban);
    window.addEventListener('dev-logs:open-insight', openInsight);

    return () => {
      window.removeEventListener('dev-capture:open', togglePanel);
      window.removeEventListener('dev-logs:open-kanban', openKanban);
      window.removeEventListener('dev-logs:open-insight', openInsight);
    };
  }, []);

  if (kanbanOpen) {
    return <KanbanDashboard onClose={() => setKanbanOpen(false)} />;
  }

  if (insightOpen) {
    return <InsightEngineLayout onClose={() => setInsightOpen(false)} />;
  }

  return (
    <>
      {/* Floating panel */}
      <div data-dev-logs-panel>
        <FloatingPanel
          isOpen={panelOpen}
          onClose={() => setPanelOpen(false)}
          onOpenCapture={() => {
            setPanelOpen(false);
            setCaptureOpen(true);
          }}
        />
      </div>

      {/* Floating Bug Button */}
      <div data-dev-logs-button>
        <FloatingBugButton />
      </div>

      {/* DevCapture full-screen overlay (for advanced capture mode) */}
      <DevCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </>
  );
}
