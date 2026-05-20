import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Activity, PieChart as PieIcon, BarChart2, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:4445/api/system/analytics');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      } else {
        setError(json.detail);
      }
    } catch (err) {
      setError('Failed to connect to analytics endpoint.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-blue-400">
        <Activity className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 p-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-bold mb-2">Analytics Unavailable</h2>
          <p className="text-sm">{error || 'No data found'}</p>
        </div>
      </div>
    );
  }

  // Format data for Recharts
  const pieDataStatus = data.byStatus.map((s: any) => ({ name: s.status, value: s.count }));
  const pieDataPriority = data.byPriority.map((p: any) => ({ name: p.priority, value: p.count }));
  const barDataCategory = data.byCategory.map((c: any) => ({ name: c.category, count: c.count }));

  return (
    <div className="p-6 h-full overflow-y-auto text-gray-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end pb-4 border-b border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-1">High-level metrics and trends for tracked issues and features</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{data.total}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total Requests</div>
          </div>
        </div>

        {/* Timeline Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Request Volume (Last 14 Days)
          </h3>
          <div className="h-64 w-full">
            {data.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 12}} />
                  <YAxis stroke="#9ca3af" tick={{fontSize: 12}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="Requests" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 text-sm">No timeline data available</div>
            )}
          </div>
        </div>

        {/* Breakdown Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Status Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" />
              Status Breakdown
            </h3>
            <div className="flex-1 min-h-[200px]">
              {pieDataStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieDataStatus.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">No data</div>
              )}
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-orange-400" />
              Priority Breakdown
            </h3>
            <div className="flex-1 min-h-[200px]">
              {pieDataPriority.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataPriority} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieDataPriority.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">No data</div>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col">
            <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-400" />
              Category Breakdown
            </h3>
            <div className="flex-1 min-h-[200px]">
              {barDataCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataCategory} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" stroke="#9ca3af" tick={{fontSize: 12}} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{fontSize: 12}} width={80} />
                    <Tooltip cursor={{fill: '#1f2937'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Count">
                      {barDataCategory.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">No data</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
