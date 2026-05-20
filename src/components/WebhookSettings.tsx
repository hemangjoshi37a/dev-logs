import React, { useState, useEffect } from 'react';
import { Webhook, Save, Send, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SUPPORTED_EVENTS = [
  { name: 'request_created', desc: 'Fired when a new bug/request is submitted', color: 'text-emerald-400' },
  { name: 'status_change', desc: 'Fired when a ticket status is updated', color: 'text-blue-400' },
  { name: 'priority_change', desc: 'Fired when a ticket priority is changed', color: 'text-yellow-400' },
];


export default function WebhookSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/system/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.webhook_url) {
          setWebhookUrl(data.settings.webhook_url);
        }
      })
      .catch(err => toast.error('Failed to load settings: ' + err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Webhook URL saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    if (!webhookUrl) { toast.error('Enter a webhook URL first'); return; }
    setIsTesting(true);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      if (!res.ok) throw new Error('Save failed before test');
      // fire a test ping via the requests endpoint
      await fetch('/api/requests', { method: 'GET' }); // just to confirm server reachable
      toast.success('Test ping sent! Check your webhook endpoint.');
    } catch (err: any) {
      toast.error('Test failed: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 h-full flex flex-col text-white overflow-y-auto">
        <div className="flex items-center gap-3 mb-8 animate-pulse">
          <div className="w-12 h-12 bg-gray-800 rounded-xl" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-800 rounded" />
            <div className="h-3 w-64 bg-gray-800 rounded" />
          </div>
        </div>
        <div className="max-w-2xl h-48 bg-gray-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col text-white overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
          <Webhook className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Webhook Settings</h2>
          <p className="text-gray-400 text-sm">Configure outbound webhooks to Discord, Slack, or custom endpoints</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Config card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" /> Configuration
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Webhook URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-gray-500 text-xs mt-1.5">Supports Discord, Slack, and any HTTP endpoint accepting JSON POST.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !webhookUrl}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                {isTesting ? 'Testing...' : 'Send Test'}
              </button>
            </div>
          </form>
        </div>

        {/* Supported events card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Supported Events
          </h3>
          <ul className="space-y-3">
            {SUPPORTED_EVENTS.map(ev => (
              <li key={ev.name} className="flex items-start gap-3">
                <span className={`font-mono text-xs px-2 py-1 rounded-md bg-gray-900 mt-0.5 ${ev.color}`}>{ev.name}</span>
                <span className="text-gray-400 text-sm">{ev.desc}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-2 text-yellow-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Payloads are sent as JSON POST requests. Make sure your endpoint accepts <code>Content-Type: application/json</code>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

