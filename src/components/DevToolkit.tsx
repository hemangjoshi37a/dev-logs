import React, { useState } from 'react';
import { Wrench, Braces, Binary, Key, RefreshCw, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DevToolkit() {
  const [activeTool, setActiveTool] = useState<'json' | 'base64' | 'jwt'>('json');

  const tools = [
    { id: 'json', icon: Braces, label: 'JSON Formatter' },
    { id: 'base64', icon: Binary, label: 'Base64 Encoder' },
    { id: 'jwt', icon: Key, label: 'JWT Decoder' },
  ];

  return (
    <div className="flex h-full text-gray-200">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col p-4 space-y-2">
        <h3 className="font-semibold text-gray-300 flex items-center gap-2 mb-4 px-2">
          <Wrench className="w-5 h-5 text-amber-500" />
          Dev Toolkit
        </h3>
        
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as any)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTool === tool.id 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <tool.icon className="w-4 h-4" />
            {tool.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-950 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 overflow-y-auto"
          >
            {activeTool === 'json' && <JsonFormatter />}
            {activeTool === 'base64' && <Base64Tool />}
            {activeTool === 'jwt' && <JwtDecoder />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JsonFormatter() {
  const [input, setInput] = useState('{"hello": "world", "nested": {"array": [1, 2, 3]}}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">JSON Formatter & Validator</h2>
        <div className="flex gap-2">
          <button onClick={formatJson} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors">Format</button>
          <button onClick={minifyJson} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors">Minify</button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste raw JSON here..."
          className="bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-amber-500 transition-colors"
          spellCheck="false"
        />
        <div className="relative flex flex-col">
          <div className={`flex-1 bg-gray-900 border ${error ? 'border-red-500/50' : 'border-gray-800'} rounded-lg p-4 font-mono text-sm overflow-auto`}>
            {error ? (
              <div className="text-red-400">Invalid JSON: {error}</div>
            ) : (
              <pre className="text-green-400 m-0">{output}</pre>
            )}
          </div>
          {output && !error && (
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Base64Tool() {
  const [input, setInput] = useState('Hello World!');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode'|'decode'>('encode');

  const process = (val: string, currentMode: 'encode'|'decode') => {
    setInput(val);
    try {
      if (currentMode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(val))));
      } else {
        setOutput(decodeURIComponent(escape(atob(val))));
      }
    } catch (e) {
      setOutput('Error: Invalid input for decoding');
    }
  };

  // Run initial conversion
  React.useEffect(() => { process(input, mode); }, [mode]);

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Base64 Encoder / Decoder</h2>
        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
          <button 
            onClick={() => setMode('encode')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'encode' ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
          >
            Encode
          </button>
          <button 
            onClick={() => setMode('decode')} 
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'decode' ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}
          >
            Decode
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Input String</label>
          <textarea
            value={input}
            onChange={(e) => process(e.target.value, mode)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none focus:border-amber-500 transition-colors"
            spellCheck="false"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Output (Base64)</label>
          <textarea
            value={output}
            readOnly
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-green-400 resize-none focus:outline-none transition-colors"
            spellCheck="false"
          />
        </div>
      </div>
    </div>
  );
}

function JwtDecoder() {
  const [token, setToken] = useState('');
  const [header, setHeader] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');

  const decodeJwt = (jwt: string) => {
    setToken(jwt);
    if (!jwt.trim()) {
      setHeader(''); setPayload(''); setError(''); return;
    }
    
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) throw new Error('JWT must have 3 parts (header.payload.signature)');
      
      const h = JSON.parse(atob(parts[0]));
      const p = JSON.parse(atob(parts[1]));
      
      setHeader(JSON.stringify(h, null, 2));
      setPayload(JSON.stringify(p, null, 2));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setHeader('');
      setPayload('');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white mb-2">JWT Decoder</h2>
      
      <div className="flex flex-col gap-2 shrink-0">
        <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Encoded Token</label>
        <textarea
          value={token}
          onChange={(e) => decodeJwt(e.target.value)}
          placeholder="Paste your JWT (ey...)"
          className="h-24 bg-gray-900 border border-gray-800 rounded-lg p-3 font-mono text-sm text-pink-400 resize-none focus:outline-none focus:border-amber-500 transition-colors break-all"
          spellCheck="false"
        />
        {error && <div className="text-red-400 text-sm mt-1">{error}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 mt-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Header (ALGORITHM & TOKEN TYPE)</label>
          <pre className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-blue-400 overflow-auto m-0">
            {header || '...'}
          </pre>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Payload (DATA)</label>
          <pre className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-auto m-0">
            {payload || '...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
