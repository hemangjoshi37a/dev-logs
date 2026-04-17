import { useEffect, useState } from 'react';
import { Bug } from 'lucide-react';

export default function FloatingBugButton() {
  const [hasErrors, setHasErrors] = useState(false);

  // Check for console errors periodically
  useEffect(() => {
    const check = () => {
      const buf = (window as any).__consoleBuffer as
        | { level: string }[]
        | undefined;
      setHasErrors(buf ? buf.some((e) => e.level === 'error') : false);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+D keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('dev-capture:open'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent('dev-capture:open'))}
      title="Report a bug (Ctrl+D)"
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-110 focus:outline-none"
      style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        boxShadow: hasErrors
          ? '0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.2)'
          : '0 4px 20px rgba(124, 58, 237, 0.4)',
        animation: hasErrors ? 'floating-bug-pulse 2s ease-in-out infinite' : undefined,
      }}
    >
      <Bug size={20} className="text-white" />

      <style>{`
        @keyframes floating-bug-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 40px rgba(168, 85, 247, 0.2); }
          50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.7), 0 0 60px rgba(168, 85, 247, 0.3); }
        }
      `}</style>
    </button>
  );
}
