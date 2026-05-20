import React, { useEffect, useState, useRef } from 'react';
import { Activity, Cpu, HardDrive } from 'lucide-react';

export default function PerformanceHUD() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState<number | null>(null);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      const now = performance.now();
      framesRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((framesRef.current * 1000) / (now - lastTimeRef.current)));
        framesRef.current = 0;
        lastTimeRef.current = now;

        // Memory
        if ((performance as any).memory) {
          const usedJSHeapSize = (performance as any).memory.usedJSHeapSize;
          setMemory(Math.round(usedJSHeapSize / 1024 / 1024));
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initX + dx,
        y: dragRef.current.initY + dy,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, initX: position.x, initY: position.y };
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 999999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(51, 65, 85, 0.5)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: '11px',
        userSelect: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      onMouseDown={handleMouseDown}
      data-dev-logs-panel
    >
      <div className="flex items-center gap-1.5" title="Frames Per Second">
        <Activity size={12} color={fps >= 50 ? '#22c55e' : fps >= 30 ? '#f59e0b' : '#ef4444'} />
        <span style={{ minWidth: '32px' }}>{fps} FPS</span>
      </div>
      
      {memory !== null && (
        <div className="flex items-center gap-1.5 border-l pl-3" style={{ borderColor: 'rgba(51, 65, 85, 0.5)' }} title="Memory (JS Heap)">
          <Cpu size={12} color="#a855f7" />
          <span style={{ minWidth: '36px' }}>{memory} MB</span>
        </div>
      )}
    </div>
  );
}
