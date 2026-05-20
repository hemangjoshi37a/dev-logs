import React, { useState, useEffect } from 'react';
import { Play, Database, Table as TableIcon, AlertCircle, RefreshCw } from 'lucide-react';

export default function DatabaseExplorer() {
  const [query, setQuery] = useState('SELECT * FROM requests ORDER BY created_at DESC LIMIT 10;');
  const [results, setResults] = useState<any[] | null>(null);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch('http://localhost:4445/api/system/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "SELECT name FROM sqlite_master WHERE type='table';" })
      });
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setTables(json.data.map((r: any) => r.name));
      }
    } catch (err) {
      console.error('Failed to fetch tables', err);
    }
  };

  const executeQuery = async (sql: string = query) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setInfo(null);
    
    try {
      const res = await fetch('http://localhost:4445/api/system/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
      });
      
      const json = await res.json();
      if (json.status === 'success') {
        if (json.data) {
          setResults(json.data);
        } else if (json.info) {
          setInfo(json.info);
        }
      } else {
        setError(json.detail || 'Unknown error occurred');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full text-gray-200">
      {/* Sidebar with Tables */}
      <div className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="font-semibold text-gray-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            Database
          </h3>
          <button onClick={fetchTables} className="p-1 hover:bg-gray-800 rounded">
            <RefreshCw className="w-3 h-3 text-gray-400" />
          </button>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-xs text-gray-500 font-medium mb-2 px-2 uppercase tracking-wider">Tables</div>
          {tables.length === 0 ? (
            <div className="px-2 text-sm text-gray-500">No tables found</div>
          ) : (
            tables.map(t => (
              <div key={t} className="mb-1">
                <button
                  onClick={() => {
                    const q = `SELECT * FROM ${t} LIMIT 50;`;
                    setQuery(q);
                    executeQuery(q);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 text-sm flex items-center gap-2 group"
                >
                  <TableIcon className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                  {t}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Query Area */}
      <div className="flex-1 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800 bg-gray-900">
          <div className="flex gap-2 mb-2">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 h-24 bg-gray-950 border border-gray-800 rounded p-3 font-mono text-sm text-green-400 focus:outline-none focus:border-blue-500 resize-none"
              spellCheck="false"
              placeholder="Enter SQL query..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => executeQuery()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Running...' : 'Run Query'}
            </button>
            <button
              onClick={() => {
                setQuery('');
                setResults(null);
                setInfo(null);
                setError(null);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded flex items-start gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="font-mono text-sm whitespace-pre-wrap">{error}</div>
            </div>
          )}

          {info && (
            <div className="p-4 bg-green-900/20 border border-green-500/50 rounded text-green-400 font-mono text-sm">
              Query executed successfully. <br/>
              Changes: {info.changes} <br/>
              Last Insert Row ID: {info.lastInsertRowid}
            </div>
          )}

          {results && (
            <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
              {results.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No rows returned</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-950 border-b border-gray-800">
                        {Object.keys(results[0]).map(key => (
                          <th key={key} className="p-3 font-medium text-gray-400 whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="p-3 whitespace-nowrap max-w-[300px] truncate" title={String(val)}>
                              {val === null ? <span className="text-gray-600 italic">null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="p-2 bg-gray-950 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
                <span>{results.length} row(s) returned</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
