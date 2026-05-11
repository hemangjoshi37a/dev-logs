import { useState, useEffect } from 'react';
import FloatingPanel from './components/FloatingPanel';
import FloatingBugButton from './components/FloatingBugButton';
import DevCapture from './components/DevCapture';
import KanbanDashboard from './components/KanbanDashboard';
import { installConsoleInterceptor, installNetworkInterceptor } from './components/DevCapture';

// Install interceptors on load
installConsoleInterceptor();
installNetworkInterceptor();

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [kanbanOpen, setKanbanOpen] = useState(false);

  // Listen for custom events
  useEffect(() => {
    const togglePanel = () => setPanelOpen((prev) => !prev);
    const openKanban = () => {
      setPanelOpen(false);
      setKanbanOpen(true);
    };

    window.addEventListener('dev-capture:open', togglePanel);
    window.addEventListener('dev-logs:open-kanban', openKanban);

    return () => {
      window.removeEventListener('dev-capture:open', togglePanel);
      window.removeEventListener('dev-logs:open-kanban', openKanban);
    };
  }, []);

  if (kanbanOpen) {
    return <KanbanDashboard onClose={() => setKanbanOpen(false)} />;
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
