import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Server, Clock, Activity, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('http://localhost:4445/api/system/metrics');
      const json = await res.json();
      if (json.status === 'success') {
        setMetrics(json.data);
        setError(null);
      } else {
        setError(json.detail);
      }
    } catch (err) {
      setError('Failed to connect to the server metrics endpoint.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 p-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-bold mb-2">Metrics Unavailable</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center text-blue-400">
        <Activity className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  const memoryPercent = metrics.memory.percent;
  const heapPercent = (metrics.processMemory.heapUsed / metrics.processMemory.heapTotal) * 100 || 0;
  const loadAvg1 = metrics.cpu.loadAvg[0];
  
  // A rough CPU percentage based on 1m load / cores (not perfect but good for visuals)
  const cpuPercent = Math.min((loadAvg1 / metrics.cpu.cores) * 100, 100);

  return (
    <div className="p-6 h-full overflow-y-auto text-gray-200">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Server className="w-6 h-6 text-emerald-400" />
              System Monitor
            </h1>
            <p className="text-gray-400 text-sm mt-1">Real-time telemetry and resource usage of the Dev-Logs server</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-semibold">System Uptime</div>
            <div className="font-mono text-emerald-400 font-medium">
              <Clock className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              {formatUptime(metrics.uptime)}
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* OS Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Terminal className="w-16 h-16" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">Environment</h3>
            <div className="space-y-3 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Platform</span>
                <span className="font-mono text-white capitalize">{metrics.os.platform} ({metrics.os.arch})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">OS Release</span>
                <span className="font-mono text-white">{metrics.os.release}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Node.js</span>
                <span className="font-mono text-green-400">{metrics.os.nodeVersion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Process Uptime</span>
                <span className="font-mono text-white">{formatUptime(metrics.processUptime)}</span>
              </div>
            </div>
          </div>

          {/* CPU Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between">
              CPU Usage
              <Cpu className="w-4 h-4 text-blue-400" />
            </h3>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-2xl font-bold text-white">{cpuPercent.toFixed(1)}%</span>
                <span className="text-gray-500 text-sm font-mono mt-1">{metrics.cpu.cores} Cores</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cpuPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className={`h-2.5 rounded-full ${cpuPercent > 80 ? 'bg-red-500' : cpuPercent > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                ></motion.div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="text-gray-400 truncate" title={metrics.cpu.model}>{metrics.cpu.model}</div>
              <div className="flex gap-4 font-mono text-xs text-gray-500">
                <span>Load: {metrics.cpu.loadAvg[0].toFixed(2)} (1m)</span>
                <span>{metrics.cpu.loadAvg[1].toFixed(2)} (5m)</span>
                <span>{metrics.cpu.loadAvg[2].toFixed(2)} (15m)</span>
              </div>
            </div>
          </div>

          {/* System Memory Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between">
              System Memory
              <HardDrive className="w-4 h-4 text-purple-400" />
            </h3>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-2xl font-bold text-white">{memoryPercent.toFixed(1)}%</span>
                <span className="text-gray-500 text-sm font-mono mt-1">{formatBytes(metrics.memory.total)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${memoryPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className={`h-2.5 rounded-full ${memoryPercent > 85 ? 'bg-red-500' : memoryPercent > 60 ? 'bg-orange-500' : 'bg-purple-500'}`}
                ></motion.div>
              </div>
            </div>
            <div className="flex justify-between text-sm mt-4 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-400">Used</span>
                <span className="text-white">{formatBytes(metrics.memory.used)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                <span className="text-gray-400">Free</span>
                <span className="text-white">{formatBytes(metrics.memory.free)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Node Process Detailed Memory */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
           <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
            Node Process Memory Profile
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* V8 Heap Usage */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex justify-between mb-2">
                <span className="text-gray-300 font-medium">V8 Heap Usage</span>
                <span className="font-mono text-emerald-400">{formatBytes(metrics.processMemory.heapUsed)} / {formatBytes(metrics.processMemory.heapTotal)}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${heapPercent}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                  className="h-full rounded-full bg-emerald-500 relative z-10"
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center z-20 text-[10px] font-bold text-white shadow-sm mix-blend-difference">
                  {heapPercent.toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-gray-500">Dynamically allocated memory for JavaScript objects.</p>
            </div>

            {/* RSS & External */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">Resident Set Size (RSS)</span>
                  <span className="font-mono text-white text-sm">{formatBytes(metrics.processMemory.rss)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Total memory allocated for the process execution.</p>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">External (C++ Addons/Buffers)</span>
                  <span className="font-mono text-white text-sm">{formatBytes(metrics.processMemory.external)}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5">
                  <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Memory used by C++ objects bound to JavaScript objects.</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
