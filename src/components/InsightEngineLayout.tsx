import React, { useState } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import MockStudio from './MockStudio';
import AutoTestGenerator from './AutoTestGenerator';
import { X, Activity, Server, Code } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function InsightEngineLayout({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'mock' | 'tests'>('analytics');

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-wide">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Insight Engine
          </div>

          <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Activity className="w-4 h-4" /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('mock')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'mock' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Server className="w-4 h-4" /> Mock Studio
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'tests' 
                  ? 'bg-gray-800 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Code className="w-4 h-4" /> Auto-Tests
            </button>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-2 bg-gray-900 hover:bg-red-500/20 hover:text-red-400 text-gray-400 rounded-lg transition-colors group"
        >
          <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-gray-900">
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'analytics' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <AnalyticsDashboard />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'mock' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <MockStudio />
        </div>
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'tests' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <AutoTestGenerator />
        </div>
      </div>
    </div>
  );
}
