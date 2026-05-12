import React, { useState, useEffect } from 'react';
import { mockEngineInstance } from '../lib/mockEngine';
import { MockRule } from '../types/advanced';
import { Settings, Play, Square, Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

export default function MockStudio() {
  const [rules, setRules] = useState<MockRule[]>([]);
  const [isEngineActive, setIsEngineActive] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<MockRule> | null>(null);

  useEffect(() => {
    setRules(mockEngineInstance.getRules());
  }, []);

  const handleToggleEngine = () => {
    if (isEngineActive) {
      mockEngineInstance.stop();
    } else {
      mockEngineInstance.start();
    }
    setIsEngineActive(!isEngineActive);
  };

  const handleSaveRule = () => {
    if (!editingRule?.name || !editingRule?.urlPattern) return;

    if (editingRule.id) {
      mockEngineInstance.updateRule(editingRule.id, editingRule);
    } else {
      mockEngineInstance.addRule({
        name: editingRule.name,
        urlPattern: editingRule.urlPattern,
        method: editingRule.method || 'ALL',
        responseStatus: editingRule.responseStatus || 200,
        responseBody: editingRule.responseBody || '{}',
        responseHeaders: editingRule.responseHeaders || '{"Content-Type": "application/json"}',
        delayMs: editingRule.delayMs || 0,
        isActive: editingRule.isActive ?? true,
      });
    }
    setRules(mockEngineInstance.getRules());
    setEditingRule(null);
  };

  const handleDeleteRule = (id: string) => {
    mockEngineInstance.deleteRule(id);
    setRules(mockEngineInstance.getRules());
  };

  const toggleRuleActive = (id: string, current: boolean) => {
    mockEngineInstance.updateRule(id, { isActive: !current });
    setRules(mockEngineInstance.getRules());
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen font-sans flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-400" />
            Mock Studio
          </h1>
          <p className="text-gray-400 mt-1">Intercept API calls and return custom mocked responses.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Engine Status:</span>
            {isEngineActive ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-sm font-bold border border-emerald-400/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500 bg-gray-800 px-3 py-1 rounded-full text-sm font-bold border border-gray-700">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                INACTIVE
              </span>
            )}
          </div>
          <button
            onClick={handleToggleEngine}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isEngineActive 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}
          >
            {isEngineActive ? <><Square className="w-4 h-4 fill-current" /> Stop Interceptor</> : <><Play className="w-4 h-4 fill-current" /> Start Interceptor</>}
          </button>
          <button
            onClick={() => setEditingRule({ isActive: true, method: 'ALL', responseStatus: 200, delayMs: 0 })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Rule
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <div className="lg:col-span-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-xl">
          <div className="p-4 border-b border-gray-700 bg-gray-800/50">
            <h2 className="text-lg font-semibold">Mock Rules</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {rules.length === 0 ? (
              <div className="text-center p-8 text-gray-500 text-sm">
                No mock rules defined. Create one to start intercepting traffic.
              </div>
            ) : rules.map(rule => (
              <div 
                key={rule.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  editingRule?.id === rule.id 
                    ? 'bg-gray-700 border-blue-500' 
                    : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                } ${!rule.isActive && 'opacity-60'}`}
                onClick={() => setEditingRule(rule)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-blue-300 truncate pr-2">{rule.name}</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleRuleActive(rule.id, rule.isActive); }}
                      className="text-gray-400 hover:text-white"
                      title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.isActive ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-gray-600" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                      className="text-gray-400 hover:text-red-400 ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                    rule.method === 'GET' ? 'text-blue-400 bg-blue-400/10' :
                    rule.method === 'POST' ? 'text-emerald-400 bg-emerald-400/10' :
                    rule.method === 'ALL' ? 'text-purple-400 bg-purple-400/10' :
                    'text-yellow-400 bg-yellow-400/10'
                  }`}>
                    {rule.method}
                  </span>
                  <span className="font-mono text-gray-400 truncate">{rule.urlPattern}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>Status: <span className={rule.responseStatus >= 400 ? 'text-red-400' : 'text-emerald-400'}>{rule.responseStatus}</span></span>
                  <span>Delay: {rule.delayMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex flex-col shadow-xl">
          {editingRule ? (
            <>
              <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-400" />
                  {editingRule.id ? 'Edit Rule' : 'New Rule'}
                </h2>
                <button 
                  onClick={handleSaveRule}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Rule
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Rule Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={editingRule.name || ''}
                      onChange={e => setEditingRule({...editingRule, name: e.target.value})}
                      placeholder="e.g., Mock Login Success"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Status Code</label>
                    <input 
                      type="number" 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={editingRule.responseStatus || 200}
                      onChange={e => setEditingRule({...editingRule, responseStatus: parseInt(e.target.value) || 200})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Method</label>
                    <select 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      value={editingRule.method || 'ALL'}
                      onChange={e => setEditingRule({...editingRule, method: e.target.value as any})}
                    >
                      <option value="ALL">ALL</option>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-400 mb-1">URL Pattern (String or Regex)</label>
                    <input 
                      type="text" 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                      value={editingRule.urlPattern || ''}
                      onChange={e => setEditingRule({...editingRule, urlPattern: e.target.value})}
                      placeholder="e.g., /api/v1/users or .*\/users\/.*"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Delay (ms)</label>
                  <input 
                    type="range" 
                    min="0" max="5000" step="100"
                    className="w-full accent-blue-500"
                    value={editingRule.delayMs || 0}
                    onChange={e => setEditingRule({...editingRule, delayMs: parseInt(e.target.value)})}
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">{editingRule.delayMs || 0}ms simulated latency</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1 flex justify-between">
                    Response Headers (JSON)
                  </label>
                  <textarea 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 h-24"
                    value={editingRule.responseHeaders || ''}
                    onChange={e => setEditingRule({...editingRule, responseHeaders: e.target.value})}
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1 flex justify-between">
                    Response Body
                  </label>
                  <textarea 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500 h-64 custom-scrollbar"
                    value={editingRule.responseBody || ''}
                    onChange={e => setEditingRule({...editingRule, responseBody: e.target.value})}
                    placeholder='{"success": true, "data": []}'
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
              <Settings className="w-16 h-16 opacity-20" />
              <p>Select a rule from the left to edit, or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
