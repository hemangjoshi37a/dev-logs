import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug,
  LayoutDashboard,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from './lib/utils';
import { fetchRequests } from './lib/api';
import StatsOverview from './components/StatsOverview';
import RequestList from './components/RequestList';
import RequestDetail from './components/RequestDetail';
import DevCapture from './components/DevCapture';
import FloatingBugButton from './components/FloatingBugButton';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/requests', icon: List, label: 'All Requests', end: false },
];

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);

  const { data: requests } = useQuery({
    queryKey: ['requests-sidebar'],
    queryFn: () => fetchRequests(),
    staleTime: 60_000,
  });

  const totalCount = requests?.length ?? 0;
  const openCount =
    requests?.filter(
      (r) => r.status === 'submitted' || r.status === 'in_progress',
    ).length ?? 0;
  const doneCount =
    requests?.filter((r) => r.status === 'completed').length ?? 0;

  // Listen for custom event from FloatingBugButton
  useEffect(() => {
    const handler = () => setCaptureOpen(true);
    window.addEventListener('dev-capture:open', handler);
    return () => window.removeEventListener('dev-capture:open', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col border-r border-border bg-card/50 backdrop-blur-sm relative z-20 flex-shrink-0"
      >
        {/* Branding */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
            <Bug size={16} className="text-primary" />
          </div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-foreground font-semibold text-[15px] tracking-tight whitespace-nowrap"
            >
              Dev Logs
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent',
                  sidebarCollapsed && 'justify-center px-0',
                )
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Stats summary at bottom */}
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 pb-4 space-y-2"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
              Summary
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total</span>
              <span className="text-foreground font-medium">{totalCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Open</span>
              <span className="text-yellow-400 font-medium">{openCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Done</span>
              <span className="text-emerald-400 font-medium">{doneCount}</span>
            </div>
          </motion.div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-30"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronLeft size={12} />
          )}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={
                <PageWrapper key="dashboard">
                  <StatsOverview />
                </PageWrapper>
              }
            />
            <Route
              path="/requests"
              element={
                <PageWrapper key="requests">
                  <RequestList />
                </PageWrapper>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <PageWrapper key="detail">
                  <RequestDetail />
                </PageWrapper>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Floating Bug Button */}
      <FloatingBugButton />

      {/* DevCapture Overlay */}
      <DevCapture open={captureOpen} onClose={() => setCaptureOpen(false)} />
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}
