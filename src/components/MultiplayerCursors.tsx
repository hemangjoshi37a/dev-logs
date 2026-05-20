import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MousePointer2 } from 'lucide-react';

interface CursorData {
  id: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];

export default function MultiplayerCursors() {
  const [cursors, setCursors] = useState<{ [id: string]: CursorData }>({});
  const socketRef = useRef<Socket | null>(null);
  const myColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  useEffect(() => {
    // Connect to Socket.io server
    const port = window.location.port === '4444' ? '4445' : window.location.port;
    const socket = io(`http://${window.location.hostname}:${port}`);
    socketRef.current = socket;

    socket.on('cursor-move', (data: CursorData) => {
      setCursors((prev) => ({
        ...prev,
        [data.id]: data,
      }));
    });

    socket.on('cursor-remove', ({ id }: { id: string }) => {
      setCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[id];
        return newCursors;
      });
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (socketRef.current?.connected) {
        // Send our cursor position
        socketRef.current.emit('cursor-move', {
          x: e.clientX,
          y: e.clientY,
          color: myColor.current,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {Object.values(cursors).map((cursor) => (
        <div
          key={cursor.id}
          className="absolute flex items-start transition-transform duration-75 ease-out will-change-transform"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <MousePointer2 
            className="w-5 h-5 -ml-2 -mt-1 drop-shadow-md" 
            style={{ color: cursor.color, fill: cursor.color }}
          />
          <span 
            className="ml-2 mt-4 px-2 py-0.5 rounded text-xs text-white font-medium shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            Dev {cursor.id.slice(0, 4)}
          </span>
        </div>
      ))}
    </div>
  );
}
