import React, { useState, useEffect } from 'react';
import { Play, RotateCw, Settings, Edit3, CheckCircle2, XCircle, Clock, Save, Code, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function ApiReplay() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  
  // Edited state
  const [editMethod, setEditMethod] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editHeaders, setEditHeaders] = useState('');
  const [editBody, setEditBody] = useState('');
  
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);

  useEffect(() => {
    // Load requests from global buffer periodically
    const updateRequests = () => {
      const buffer = (window as any).__networkBuffer || [];
      // Only keep requests from the last few minutes, or just reverse them
      setRequests([...buffer].reverse());
    };
    
    updateRequests();
    const interval = setInterval(updateRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (req: any) => {
    setSelectedRequest(req);
    setEditMethod(req.method || 'GET');
    setEditUrl(req.url || '');
    setEditHeaders(req.requestHeaders ? JSON.stringify(req.requestHeaders, null, 2) : '{\n}');
    setEditBody(req.requestBody || '');
    setReplayResult(null);
  };

  const handleReplay = async () => {
    if (!editUrl) return;
    setReplayLoading(true);
    setReplayResult(null);
    const start = Date.now();
    try {
      let parsedHeaders = {};
      try {
        if (editHeaders.trim()) {
          parsedHeaders = JSON.parse(editHeaders);
        }
      } catch {
        toast.error('Invalid JSON in headers');
        setReplayLoading(false);
        return;
      }

      const options: RequestInit = {
        method: editMethod,
        headers: parsedHeaders,
      };

      if (editMethod !== 'GET' && editMethod !== 'HEAD' && editBody.trim()) {
        options.body = editBody;
      }

      const res = await fetch(editUrl, options);
      const text = await res.text();
      
      let parsedJson = null;
      try {
        parsedJson = JSON.parse(text);
      } catch { /* ignore */ }

      setReplayResult({
        status: res.status,
        statusText: res.statusText,
        duration: Date.now() - start,
        body: parsedJson ? JSON.stringify(parsedJson, null, 2) : text,
      });
      toast.success('Replay complete');
    } catch (err) {
      setReplayResult({
        status: 0,
        statusText: 'Network Error',
        duration: Date.now() - start,
        body: String(err),
      });
      toast.error('Replay failed');
    } finally {
      setReplayLoading(false);
    }
  };

  return (
    <div className="flex h-full text-[#e2e8f0]" style={{ background: '#0f172a' }}>
      {/* Left Sidebar: Request List */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.95)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'rgba(51,65,85,0.5)' }}>
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e2e8f0' }}>
            <Server size={14} color="#0ea5e9" />
            Network Buffer
          </h2>
          <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Recently intercepted requests</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {requests.length === 0 ? (
            <div className="text-[11px] p-4 text-center" style={{ color: '#64748b' }}>No requests intercepted yet. Navigate the app to see them here.</div>
          ) : (
            requests.map((req, i) => {
              const isSelected = selectedRequest === req;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(req)}
                  className="w-full text-left p-2 rounded-lg text-[11px] transition-colors group flex items-start gap-2"
                  style={{
                    background: isSelected ? 'rgba(14,165,233,0.1)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(14,165,233,0.3)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(51,65,85,0.4)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className={`font-bold ${req.method === 'GET' ? 'text-blue-400' : req.method === 'POST' ? 'text-green-400' : req.method === 'PUT' ? 'text-yellow-400' : 'text-purple-400'}`}>
                    {req.method}
                  </span>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="truncate" style={{ color: isSelected ? '#bae6fd' : '#cbd5e1' }}>
                      {req.url.split('/').pop() || req.url}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1" style={{ color: req.status && req.status < 400 ? '#34d399' : '#ef4444' }}>
                        {req.status && req.status < 400 ? <CheckCircle2 size={8} /> : <XCircle size={8} />}
                        {req.status || 'FAIL'}
                      </span>
                      <span className="flex items-center gap-1 text-[9px]" style={{ color: '#64748b' }}>
                        <Clock size={8} /> {req.duration ? `${req.duration}ms` : '?'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content: Replay Engine */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
        {selectedRequest ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header / Actions */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(15,23,42,0.95)' }}>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>API Request Replay</h3>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>Edit the payload and re-send the request</p>
              </div>
              <button
                onClick={handleReplay}
                disabled={replayLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  background: replayLoading ? 'rgba(14,165,233,0.5)' : '#0ea5e9',
                  color: '#fff',
                }}
              >
                {replayLoading ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                Send Request
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-2">
                <select
                  value={editMethod}
                  onChange={e => setEditMethod(e.target.value)}
                  className="px-3 py-1.5 rounded outline-none font-bold text-xs"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)', color: '#38bdf8' }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded outline-none text-xs font-mono"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)', color: '#f8fafc' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 h-64">
                <div className="flex flex-col">
                  <label className="text-[11px] font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <Settings size={12} /> Headers (JSON)
                  </label>
                  <textarea
                    value={editHeaders}
                    onChange={e => setEditHeaders(e.target.value)}
                    className="flex-1 px-3 py-2 rounded outline-none text-[11px] font-mono resize-none"
                    spellCheck={false}
                    style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)', color: '#cbd5e1' }}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-[11px] font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <Edit3 size={12} /> Request Body
                  </label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    className="flex-1 px-3 py-2 rounded outline-none text-[11px] font-mono resize-none"
                    spellCheck={false}
                    disabled={editMethod === 'GET' || editMethod === 'HEAD'}
                    style={{ 
                      background: editMethod === 'GET' ? 'rgba(15,23,42,0.3)' : 'rgba(15,23,42,0.6)', 
                      border: '1px solid rgba(51,65,85,0.5)', 
                      color: editMethod === 'GET' ? '#64748b' : '#cbd5e1' 
                    }}
                    placeholder={editMethod === 'GET' ? "Body not allowed for GET requests" : "Enter request payload..."}
                  />
                </div>
              </div>

              {/* Replay Result */}
              {replayResult && (
                <div className="mt-6">
                  <label className="text-[11px] font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
                    <Code size={12} /> Response
                  </label>
                  <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(51,65,85,0.5)' }}>
                    <div className="px-3 py-2 border-b flex items-center gap-3 text-[11px]" style={{ borderColor: 'rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.5)' }}>
                      <span className="font-bold flex items-center gap-1" style={{ color: replayResult.status < 400 ? '#34d399' : '#ef4444' }}>
                        {replayResult.status < 400 ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {replayResult.status} {replayResult.statusText}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: '#94a3b8' }}>
                        <Clock size={10} /> {replayResult.duration}ms
                      </span>
                    </div>
                    <pre className="p-3 text-[11px] font-mono overflow-auto max-h-80" style={{ background: 'rgba(15,23,42,0.6)', color: '#cbd5e1' }}>
                      {replayResult.body}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Server size={32} color="#475569" className="mb-3" />
            <p className="text-[12px] font-medium" style={{ color: '#64748b' }}>Select a request from the list to replay</p>
          </div>
        )}
      </div>
    </div>
  );
}
