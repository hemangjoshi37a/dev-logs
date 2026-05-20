import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRequests } from '../lib/api';
import { Monitor, Smartphone, Globe, Cpu, MemoryStick } from 'lucide-react';
import type { DevRequest } from '../types';

export default function EnvironmentProfiles() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetchRequests(),
  });

  const stats = useMemo(() => {
    const osCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    const nodeCounts: Record<string, number> = {};
    let totalRAM = 0;
    let ramCount = 0;

    requests.forEach((req: DevRequest) => {
      // Browser parsing from description string since environment_context might be backend focused
      const brMatch = req.description.match(/\*\*Browser\*\*:\s*([^\\n]+)/);
      if (brMatch) {
        const browser = brMatch[1].trim().split(' ')[0] || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      }

      if (req.environment_context) {
        if (req.environment_context.os) {
          const osStr = req.environment_context.os.split(' ')[0] || 'Unknown';
          osCounts[osStr] = (osCounts[osStr] || 0) + 1;
        }
        if (req.environment_context.node) {
          nodeCounts[req.environment_context.node] = (nodeCounts[req.environment_context.node] || 0) + 1;
        }
        if (req.environment_context.memory_gb) {
          totalRAM += req.environment_context.memory_gb;
          ramCount++;
        }
      }
    });

    const sortObject = (obj: Record<string, number>) => 
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      os: sortObject(osCounts),
      browser: sortObject(browserCounts),
      node: sortObject(nodeCounts),
      avgRam: ramCount > 0 ? Math.round(totalRAM / ramCount) : 0
    };
  }, [requests]);

  if (isLoading) {
    return (
      <div className="p-8 h-full flex flex-col text-white overflow-y-auto">
        <div className="flex items-center gap-3 mb-8 animate-pulse">
          <div className="w-12 h-12 bg-gray-800 rounded-xl" />
          <div className="space-y-2">
            <div className="h-5 w-48 bg-gray-800 rounded" />
            <div className="h-3 w-72 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-gray-800/50 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const maxOs = stats.os[0]?.[1] || 1;
  const maxBrowser = stats.browser[0]?.[1] || 1;
  const maxNode = stats.node[0]?.[1] || 1;

  return (
    <div className="p-8 h-full flex flex-col text-white overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
          <Monitor className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Environment Profiles</h2>
          <p className="text-gray-400 text-sm">Aggregated statistics from <span className="text-purple-400 font-semibold">{requests.length}</span> requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* OS */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-5 text-blue-400">
            <Monitor className="w-5 h-5" />
            <h3 className="font-semibold text-gray-200">Operating Systems</h3>
          </div>
          {stats.os.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Submit a bug to capture OS data.</p>
          ) : (
            <ul className="space-y-3">
              {stats.os.map(([os, count]) => (
                <li key={os}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate">{os}</span>
                    <span className="text-gray-500 font-mono text-xs">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(count / maxOs) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Browsers */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-5 text-emerald-400">
            <Globe className="w-5 h-5" />
            <h3 className="font-semibold text-gray-200">Browsers</h3>
          </div>
          {stats.browser.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Submit a bug via DevCapture to capture browser data.</p>
          ) : (
            <ul className="space-y-3">
              {stats.browser.map(([br, count]) => (
                <li key={br}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate max-w-[120px]">{br}</span>
                    <span className="text-gray-500 font-mono text-xs">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(count / maxBrowser) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Node Versions */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-5 text-yellow-400">
            <Cpu className="w-5 h-5" />
            <h3 className="font-semibold text-gray-200">Node Versions</h3>
          </div>
          {stats.node.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No Node.js data captured yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.node.map(([v, count]) => (
                <li key={v}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-mono">{v}</span>
                    <span className="text-gray-500 font-mono text-xs">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${(count / maxNode) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Avg RAM */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl flex flex-col">
          <div className="flex items-center gap-2 mb-5 text-pink-400">
            <MemoryStick className="w-5 h-5" />
            <h3 className="font-semibold text-gray-200">Avg Memory</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            {stats.avgRam > 0 ? (
              <>
                <div className="text-5xl font-mono font-bold text-gray-200">
                  {stats.avgRam}<span className="text-2xl text-gray-500 ml-1">GB</span>
                </div>
                <p className="text-gray-500 text-xs mt-2">Average across all reporters</p>
              </>
            ) : (
              <p className="text-gray-500 text-sm italic text-center">No RAM data captured yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

