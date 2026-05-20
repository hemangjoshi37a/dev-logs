import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import ArchitectureCanvas from './ArchitectureCanvas';
import MockStudio from './MockStudio';
import AutoTestGenerator from './AutoTestGenerator';
import ExecutionEngine from './ExecutionEngine';
import EnvironmentProfiles from './EnvironmentProfiles';
import WebhookSettings from './WebhookSettings';
import ApiReplay from './ApiReplay';
import DatabaseExplorer from './DatabaseExplorer';
import SystemMonitor from './SystemMonitor';
import DevToolkit from './DevToolkit';
import { X, Activity, Server, Code, TerminalSquare, Globe, Webhook, RefreshCcw, Database, HardDrive, Wrench, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onClose: () => void;
}

export default function InsightEngineLayout({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'canvas' | 'mock' | 'tests' | 'exec' | 'env' | 'webhook' | 'replay' | 'db' | 'sys' | 'tools'>('analytics');
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Simulated Application Crash for DevLogsErrorBoundary');
  }

  const renderTabContent = () => {
    switch(activeTab) {
      case 'analytics': return <AnalyticsDashboard />;
      case 'canvas': return <ArchitectureCanvas />;
      case 'mock': return <MockStudio />;
      case 'tests': return <AutoTestGenerator />;
      case 'exec': return <ExecutionEngine />;
      case 'env': return <EnvironmentProfiles />;
      case 'webhook': return <WebhookSettings />;
      case 'replay': return <ApiReplay />;
      case 'db': return <DatabaseExplorer />;
      case 'sys': return <SystemMonitor />;
      case 'tools': return <DevToolkit />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[99999] bg-black flex flex-col font-sans"
    >
      {/* Top Navigation Bar */}
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center shrink-0 overflow-x-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-wide shrink-0">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Insight Engine
          </div>

          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 shrink-0">
            {[
              { id: 'analytics', icon: Activity, label: 'Analytics', color: '' },
              { id: 'canvas', icon: Share2, label: 'Architecture', color: 'text-pink-400' },
              { id: 'mock', icon: Server, label: 'Mock Studio', color: '' },
              { id: 'tests', icon: Code, label: 'Auto-Tests', color: '' },
              { id: 'exec', icon: TerminalSquare, label: 'Exec Engine', color: 'text-green-400' },
              { id: 'db', icon: Database, label: 'DB Explorer', color: 'text-blue-400' },
              { id: 'sys', icon: HardDrive, label: 'System', color: 'text-emerald-400' },
              { id: 'tools', icon: Wrench, label: 'Dev Tools', color: 'text-amber-500' },
              { id: 'env', icon: Globe, label: 'Env Profiles', color: 'text-purple-400' },
              { id: 'webhook', icon: Webhook, label: 'Webhooks', color: 'text-indigo-400' },
              { id: 'replay', icon: RefreshCcw, label: 'API Replay', color: 'text-orange-400' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-gray-800 rounded-md shadow"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className={`w-4 h-4 ${tab.color}`} /> {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShouldCrash(true)}
            className="p-2 text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30"
          >
            Test Crash
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-900 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors group"
          >
            <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-gray-900 min-h-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
