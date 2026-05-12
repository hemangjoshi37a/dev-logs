import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { NetworkLog } from '../types/advanced';
import { mockEngineInstance } from '../lib/mockEngine';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

export default function AnalyticsDashboard() {
  const [logs, setLogs] = useState<NetworkLog[]>([]);
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '24h'>('1h');

  useEffect(() => {
    // Initial load
    setLogs(mockEngineInstance.getLogs());

    // Listen for new logs
    const handleNewLog = (e: any) => {
      setLogs((prev) => [e.detail, ...prev].slice(0, 1000));
    };

    window.addEventListener('dev-logs:network-update', handleNewLog);
    return () => window.removeEventListener('dev-logs:network-update', handleNewLog);
  }, []);

  // Compute metrics
  const totalRequests = logs.length;
  const errorRequests = logs.filter(l => l.status >= 400 || l.status === 0).length;
  const avgLatency = logs.length > 0 ? logs.reduce((acc, l) => acc + l.duration, 0) / logs.length : 0;
  const mockedRequests = logs.filter(l => l.isMocked).length;

  // Latency over time
  const latencyData = [...logs].reverse().map(l => ({
    time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: Math.round(l.duration),
    status: l.status
  }));

  // Status Codes distribution
  const statusCounts = logs.reduce((acc: Record<number, number>, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  const statusData = Object.keys(statusCounts).map(k => ({
    name: `Status ${k}`,
    value: statusCounts[Number(k)]
  }));

  // Top endpoints by latency
  const endpointLatency = logs.reduce((acc: Record<string, { total: number, count: number }>, l) => {
    try {
      const url = new URL(l.url);
      const path = url.pathname;
      if (!acc[path]) acc[path] = { total: 0, count: 0 };
      acc[path].total += l.duration;
      acc[path].count += 1;
    } catch {
      if (!acc[l.url]) acc[l.url] = { total: 0, count: 0 };
      acc[l.url].total += l.duration;
      acc[l.url].count += 1;
    }
    return acc;
  }, {});

  const topSlowestEndpoints = Object.keys(endpointLatency)
    .map(k => ({
      name: k,
      avgLatency: Math.round(endpointLatency[k].total / endpointLatency[k].count)
    }))
    .sort((a, b) => b.avgLatency - a.avgLatency)
    .slice(0, 5);

  // Method distribution
  const methodCounts = logs.reduce((acc: Record<string, number>, l) => {
    acc[l.method] = (acc[l.method] || 0) + 1;
    return acc;
  }, {});
  const methodData = Object.keys(methodCounts).map(k => ({
    name: k,
    value: methodCounts[k]
  }));

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            Insight Engine
          </h1>
          <p className="text-gray-400 mt-1">Real-time performance and error analytics</p>
        </div>
        <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
          {['15m', '1h', '24h'].map(t => (
            <button
              key={t}
              onClick={() => setTimeRange(t as any)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                timeRange === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <div className="text-gray-400 text-sm font-medium mb-1">Total Requests</div>
          <div className="text-3xl font-bold">{totalRequests}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <div className="text-gray-400 text-sm font-medium mb-1">Error Rate</div>
          <div className="text-3xl font-bold text-red-400">
            {totalRequests > 0 ? Math.round((errorRequests / totalRequests) * 100) : 0}%
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <div className="text-gray-400 text-sm font-medium mb-1">Avg Latency</div>
          <div className="text-3xl font-bold text-yellow-400">{Math.round(avgLatency)}ms</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <div className="text-gray-400 text-sm font-medium mb-1">Mocked Requests</div>
          <div className="text-3xl font-bold text-emerald-400">{mockedRequests}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Latency Area Chart */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <h3 className="text-lg font-medium mb-4">Request Latency Over Time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickMargin={10} />
                <YAxis stroke="#9ca3af" fontSize={12} unit="ms" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Slowest Endpoints Bar Chart */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg">
          <h3 className="text-lg font-medium mb-4">Slowest Endpoints</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSlowestEndpoints} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} unit="ms" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={11} width={120} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  cursor={{ fill: '#374151', opacity: 0.4 }}
                />
                <Bar dataKey="avgLatency" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {topSlowestEndpoints.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Code Pie Chart */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg lg:col-span-1">
          <h3 className="text-lg font-medium mb-4">Status Codes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem' }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Errors List */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-lg lg:col-span-2">
          <h3 className="text-lg font-medium mb-4 text-red-400 flex items-center gap-2">
            Recent Errors
          </h3>
          <div className="overflow-y-auto h-64 pr-2 custom-scrollbar">
            {logs.filter(l => l.status >= 400 || l.status === 0).length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No errors recorded yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {logs.filter(l => l.status >= 400 || l.status === 0).map(l => (
                  <li key={l.id} className="bg-gray-900 rounded-lg p-3 flex justify-between items-center border border-gray-700/50">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          l.status >= 500 ? 'bg-red-900/50 text-red-400' : 'bg-orange-900/50 text-orange-400'
                        }`}>
                          {l.status === 0 ? 'FAILED' : l.status}
                        </span>
                        <span className="text-gray-400 text-xs font-mono">{l.method}</span>
                      </div>
                      <div className="text-sm truncate text-gray-300 font-mono" title={l.url}>
                        {l.url}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
