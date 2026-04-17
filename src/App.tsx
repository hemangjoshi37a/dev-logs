import { useState, useEffect } from 'react';
import FloatingPanel from './components/FloatingPanel';
import FloatingBugButton from './components/FloatingBugButton';
import DevCapture from './components/DevCapture';
import { installConsoleInterceptor } from './components/DevCapture';

// Install console interceptor on load
installConsoleInterceptor();

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  // Listen for the custom event from FloatingBugButton (toggles panel)
  useEffect(() => {
    const handler = () => setPanelOpen((prev) => !prev);
    window.addEventListener('dev-capture:open', handler);
    return () => window.removeEventListener('dev-capture:open', handler);
  }, []);

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
